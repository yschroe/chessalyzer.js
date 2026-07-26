import { EventEmitter } from 'node:events';
import { availableParallelism } from 'node:os';
import { join } from 'node:path';

import WorkerPool from '#core/worker-pool';
import GameParser from '#parsing/game-parser';
import { GameLineParser } from '#pgn/game-assembler';
import { readLinesFast } from '#pgn/line-reader';
import { encodePgnChunkText, readPgnChunks } from '#pgn/pgn-chunks';
import type {
    AnalysisConfig,
    GameAndMoveCount,
    GameProcessorAnalysisConfigFull,
    GameProcessorConfig,
    MultithreadConfig,
} from '#types/analysis';
import type { Game } from '#types/game';
import type { WorkerInitData, WorkerMessage } from '#types/worker';

/** Path to the worker file. */
const WORKER_PATH = join(import.meta.dirname, 'chess-worker.js');

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
                        path: tracker.path ?? '',
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
        const workerInitData: WorkerInitData = {
            configs: this.configs.map((cfg) => ({ trackerData: cfg.trackerData })),
        };
        const workerPool = new WorkerPool(this.resolveWorkerCount(), WORKER_PATH, workerInitData);

        const chunkConfig = {
            targetBytes: this.multithreadConfig!.targetBytes,
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

        const handleWorkerResult = (err: Error | null, result: WorkerMessage | null) => {
            if (fatalError) return;

            if (err) {
                fatalError = err;
                rejectFatal?.(err);
                return;
            }

            if (!result) return;

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

                for (const [idxCfg, cfg] of this.configs.entries()) {
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
            const workerInitData: WorkerInitData = {
                configs: this.configs.map((cfg) => ({ trackerData: cfg.trackerData })),
            };
            workerPool = new WorkerPool(this.resolveWorkerCount(), WORKER_PATH, workerInitData);
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

        const handleWorkerResult = (err: Error | null, result: WorkerMessage | null) => {
            if (fatalError) return;

            if (err) {
                fatalError = err;
                rejectFatal?.(err);
                return;
            }

            if (!result) return;

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

                for (const [idxCfg, cfg] of this.configs.entries()) {
                    if (!cfg.isDone && (!cfg.config.hasFilter || cfg.config.filter(game))) {
                        cfg.cntReadGames += 1;
                        const gamesForCfg = gameStore[idxCfg];
                        if (isMultithreaded && gamesForCfg) {
                            gamesForCfg.push(game);

                            if (gamesForCfg.length === legacyBatchSize) {
                                workerPool!.runTask(
                                    {
                                        pgnChunkBytes: encodePgnChunkText(
                                            this.gamesToPgnChunk(gamesForCfg),
                                        ),
                                        idxConfig: idxCfg,
                                        readInHeader: this.readInHeader,
                                    },
                                    handleWorkerResult,
                                );

                                gameStore[idxCfg] = [];
                            }
                        } else if (!isMultithreaded) {
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

        const cfg = this.configs[idxConfig];
        if (!cfg) return;

        if (gameTrackers) {
            for (let i = 0; i < gameTrackers.length; i += 1) {
                const tracker = cfg.trackers.game[i];
                const data = gameTrackers[i];
                if (tracker && data) tracker.add?.(data);
            }
        }
        if (moveTrackers) {
            for (let i = 0; i < moveTrackers.length; i += 1) {
                const tracker = cfg.trackers.move[i];
                const data = moveTrackers[i];
                if (tracker && data) tracker.add?.(data);
            }
        }
        cfg.processedMoves += cntMoves;
        cfg.processedGames += cntGames;

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
        const c = config ?? {};
        const filterFn = c.filter;
        const hasFilter = filterFn !== undefined;

        // If we need to filter the games, we need the header information
        if (hasFilter) this.readInHeader = true;

        const cfg: GameProcessorConfig = {
            hasFilter,
            filter: hasFilter ? filterFn : () => true,
            cntGames: c.cntGames ?? Infinity,
        };
        return cfg;
    }
}

export default GameProcessor;
