import { EventEmitter } from 'node:events';
import { availableParallelism } from 'node:os';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import GameParser from '#parsing/game-parser';
import { GameLineParser } from '#pgn/game-assembler';
import {
    DEFAULT_PGN_CHUNK_BYTES,
    encodePgnChunkText,
    readLinesFast,
    readPgnChunks,
} from '#pgn/line-reader';
import type {
    AnalysisConfig,
    GameAndMoveCount,
    GameProcessorAnalysisConfigFull,
    GameProcessorConfig,
    MultithreadConfig,
} from '#types/analysis';
import type { Game } from '#types/game';
import type { WorkerInitData, WorkerMessage } from '#types/worker';
import WorkerPool from './worker-pool';

/**
 * Class that processes games.
 */
class GameProcessor {
    configs: GameProcessorAnalysisConfigFull[];
    readInHeader: boolean;
    multithreadConfig: MultithreadConfig | null;
    useWorkerParse: boolean;

    constructor(configs: AnalysisConfig[], multithreadCfg: MultithreadConfig | null) {
        this.readInHeader = false;
        this.configs = [];
        this.multithreadConfig = multithreadCfg;
        this.useWorkerParse = multithreadCfg !== null;

        // convert AnalysisConfigs to GameProcessorAnalysisConfigFull
        for (const cfg of configs) {
            const tempCfg: GameProcessorAnalysisConfigFull = {
                trackers: { move: [], game: [] },
                trackerData: [],
                config: this.checkConfig(cfg.config ?? {}),
                processedMoves: 0,
                processedGames: 0,
                cntReadGames: 0,
                isDone: false,
            };

            if (cfg.trackers) {
                for (const tracker of cfg.trackers) {
                    if (tracker.type === 'move') {
                        tempCfg.trackers.move.push(tracker);
                    } else if (tracker.type === 'game') {
                        tempCfg.trackers.game.push(tracker);

                        // we need to read in the header if at least one game tracker is attached
                        this.readInHeader = true;
                    }

                    tempCfg.trackerData.push({
                        name: tracker.constructor.name,
                        cfg: tracker.cfg,
                        path: tracker.path,
                    });
                }
            }

            if (tempCfg.config.hasFilter || tempCfg.config.cntGames !== Infinity) {
                this.useWorkerParse = false;
            }

            this.configs.push(tempCfg);
        }
    }

    /**
     * Main function for parsing and analyzing.
     * @param path Path to the PGN file.
     * @returns Count of processed games and moves.
     */
    async processPGN(path: string): Promise<GameAndMoveCount[]> {
        const isMultithreaded = this.multithreadConfig !== null;

        if (isMultithreaded && this.useWorkerParse) {
            return this.processPGNWithWorkerParse(path);
        }

        return this.processPGNOnMainThread(path, isMultithreaded);
    }

    private async processPGNWithWorkerParse(path: string): Promise<GameAndMoveCount[]> {
        const __dirname = dirname(fileURLToPath(import.meta.url));
        const workerInitData: WorkerInitData = {
            configs: this.configs.map((cfg) => ({ trackerData: cfg.trackerData })),
        };
        const workerPool = new WorkerPool(
            this.resolveWorkerCount(),
            `${__dirname}/chess-worker.js`,
            workerInitData,
        );

        const chunkConfig = {
            targetBytes: this.multithreadConfig!.targetBytes ?? DEFAULT_PGN_CHUNK_BYTES,
            maxLines: this.multithreadConfig!.maxLines,
            minLines: this.multithreadConfig!.minLines,
        };

        // Track the first worker failure and unblock any wait on pool completion.
        // Without this, a thrown callback error leaves the pool waiting forever on 'done'.
        let fatalError: Error | undefined;
        let rejectFatal: ((err: Error) => void) | undefined;
        const fatalPromise = new Promise<never>((_, reject) => {
            rejectFatal = reject;
        });

        const handleWorkerResult = (err: Error | null, result: WorkerMessage) => {
            if (fatalError) return;

            if (err) {
                fatalError = err;
                rejectFatal?.(err);
                return;
            }

            // Worker caught a batch error and reported it via postMessage instead of throwing.
            if (result.error) {
                fatalError = new Error(result.error);
                rejectFatal?.(fatalError);
                return;
            }

            this.addDataFromWorker(null, result);
        };

        try {
            chunkLoop: for await (const chunk of readPgnChunks(path, chunkConfig)) {
                if (fatalError) break;

                for (let idxCfg = 0; idxCfg < this.configs.length; idxCfg += 1) {
                    const cfg = this.configs[idxCfg];
                    if (cfg.isDone) continue;

                    workerPool.runTask(
                        {
                            pgnChunkBytes: chunk.bytes,
                            idxConfig: idxCfg,
                            readInHeader: this.readInHeader,
                        },
                        handleWorkerResult,
                    );
                }

                if (this.configs.every((cfg) => cfg.isDone)) break chunkLoop;
            }

            if (fatalError) throw fatalError;

            workerPool.flagNotifyWhenDone = true;
            // Race 'done' against fatalPromise so errors don't hang until all tasks finish.
            await Promise.race([EventEmitter.once(workerPool, 'done'), fatalPromise]);

            return this.finishProcessing();
        } finally {
            // Always terminate workers so the process can exit after success or failure.
            await workerPool.close();
        }
    }

    private async processPGNOnMainThread(
        path: string,
        isMultithreaded: boolean,
    ): Promise<GameAndMoveCount[]> {
        let workerPool: WorkerPool | undefined;
        if (isMultithreaded) {
            const __dirname = dirname(fileURLToPath(import.meta.url));
            const workerInitData: WorkerInitData = {
                configs: this.configs.map((cfg) => ({ trackerData: cfg.trackerData })),
            };
            workerPool = new WorkerPool(
                this.resolveWorkerCount(),
                `${__dirname}/chess-worker.js`,
                workerInitData,
            );
        }

        const gameStore: Game[][] = this.configs.map(() => [] as Game[]);
        const gameParser = new GameParser();
        const lineParser = new GameLineParser({ readInHeader: this.readInHeader });
        const legacyBatchSize = this.multithreadConfig?.batchSize ?? 200;

        // Same fatal-error handling as processPGNWithWorkerParse (see above).
        let fatalError: Error | undefined;
        let rejectFatal: ((err: Error) => void) | undefined;
        const fatalPromise = new Promise<never>((_, reject) => {
            rejectFatal = reject;
        });

        const handleWorkerResult = (err: Error | null, result: WorkerMessage) => {
            if (fatalError) return;

            if (err) {
                fatalError = err;
                rejectFatal?.(err);
                return;
            }

            if (result.error) {
                fatalError = new Error(result.error);
                rejectFatal?.(fatalError);
                return;
            }

            this.addDataFromWorker(null, result);
        };

        try {
            lineLoop: for await (const line of readLinesFast(path)) {
                if (fatalError) break;

                const game = lineParser.processLine(line);
                if (!game) continue;

                for (let idxCfg = 0; idxCfg < this.configs.length; idxCfg += 1) {
                    const cfg = this.configs[idxCfg];
                    if (!cfg.isDone && (!cfg.config.hasFilter || cfg.config.filter(game))) {
                        cfg.cntReadGames += 1;
                        if (isMultithreaded) {
                            gameStore[idxCfg].push(game);

                            if (gameStore[idxCfg].length === legacyBatchSize) {
                                workerPool!.runTask(
                                    {
                                        pgnChunkBytes: encodePgnChunkText(
                                            this.gamesToPgnChunk(gameStore[idxCfg]),
                                        ),
                                        idxConfig: idxCfg,
                                        readInHeader: this.readInHeader,
                                    },
                                    handleWorkerResult,
                                );

                                gameStore[idxCfg] = [];
                            }
                        } else {
                            gameParser.processGame(game, cfg);
                        }
                        if (cfg.cntReadGames === cfg.config.cntGames) {
                            cfg.isDone = true;
                            const allDone = this.configs.reduce((a, c) => a && c.isDone, true);
                            if (allDone) break lineLoop;
                        }
                    }
                }
            }

            if (isMultithreaded && workerPool) {
                if (fatalError) throw fatalError;

                for (const [idx, games] of gameStore.entries()) {
                    if (games.length > 0) {
                        workerPool.runTask(
                            {
                                pgnChunkBytes: encodePgnChunkText(this.gamesToPgnChunk(games)),
                                idxConfig: idx,
                                readInHeader: this.readInHeader,
                            },
                            handleWorkerResult,
                        );
                    }
                }

                workerPool.flagNotifyWhenDone = true;
                await Promise.race([EventEmitter.once(workerPool, 'done'), fatalPromise]);
            }

            return this.finishProcessing();
        } finally {
            if (workerPool) await workerPool.close();
        }
    }

    private finishProcessing(): GameAndMoveCount[] {
        for (const { trackers } of this.configs) {
            for (const tracker of trackers.game) tracker.finish?.();
            for (const tracker of trackers.move) tracker.finish?.();
        }

        return this.configs.map((cfg) => ({
            cntGames: cfg.processedGames,
            cntMoves: cfg.processedMoves,
        }));
    }

    /**
     * If configured for multithreading, this function adds the result from a worker
     * thread to the main thread.
     * @param err Error object, if an error occured.
     * @param result The result of the PGN parsing from the worker thread.
     */
    private addDataFromWorker(err: Error | null, result: WorkerMessage) {
        if (err) throw err;
        // Defensive check for callers that invoke this directly (worker callbacks handle this earlier).
        if (result.error) throw new Error(result.error);

        const { idxConfig, gameTrackers, moveTrackers, cntMoves, cntGames } = result;

        if (gameTrackers) {
            for (let i = 0; i < gameTrackers.length; i += 1) {
                this.configs[idxConfig].trackers.game[i].add(gameTrackers[i]);
            }
        }
        if (moveTrackers) {
            for (let i = 0; i < moveTrackers.length; i += 1) {
                this.configs[idxConfig].trackers.move[i].add(moveTrackers[i]);
            }
        }
        this.configs[idxConfig].processedMoves += cntMoves;
        this.configs[idxConfig].processedGames += cntGames;

        const cfg = this.configs[idxConfig];
        if (cfg.processedGames >= cfg.config.cntGames) {
            cfg.isDone = true;
        }
    }

    private gamesToPgnChunk(games: Game[]): string {
        const lines: string[] = [];
        for (const game of games) {
            if (this.readInHeader) {
                for (const [key, value] of Object.entries(game)) {
                    if (key === 'moves') continue;
                    lines.push(`[${key} "${value}"]`);
                }
                lines.push('');
            }
            const result = game.Result ?? '1-0';
            lines.push(`${game.moves.join(' ')} ${result}`);
        }
        return lines.join('\n');
    }

    private resolveWorkerCount(): number {
        const configured = this.multithreadConfig?.workerCount;
        if (configured !== undefined) return Math.max(1, configured);
        return availableParallelism();
    }

    private checkConfig(config: AnalysisConfig['config']): GameProcessorConfig {
        const hasFilter = !!config.filter;

        // If we need to filter the games, we need the header information
        if (hasFilter) this.readInHeader = true;

        const cfg: GameProcessorConfig = {
            hasFilter,
            filter: hasFilter ? config.filter : () => true,
            cntGames: config.cntGames ?? Infinity,
        };
        return cfg;
    }
}

export default GameProcessor;
