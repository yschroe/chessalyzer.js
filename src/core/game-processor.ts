import { EventEmitter } from 'node:events';
import { availableParallelism } from 'node:os';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import GameParser from '../parsing/game-parser';
import { GameLineParser } from '../pgn/game-assembler';
import { DEFAULT_PGN_CHUNK_BYTES, readLinesFast, readPgnChunks } from '../pgn/line-reader';
import type {
    Game,
    AnalysisConfig,
    MultithreadConfig,
    GameAndMoveCount,
    WorkerMessage,
    GameProcessorAnalysisConfigFull,
    GameProcessorConfig,
    WorkerInitData,
} from '../types';
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
            availableParallelism(),
            `${__dirname}/chess-worker.js`,
            workerInitData,
        );

        const chunkConfig = {
            targetBytes: this.multithreadConfig!.targetBytes ?? DEFAULT_PGN_CHUNK_BYTES,
            maxLines: this.multithreadConfig!.maxLines,
            minLines: this.multithreadConfig!.minLines,
        };

        chunkLoop: for await (const chunk of readPgnChunks(path, chunkConfig)) {
            for (let idxCfg = 0; idxCfg < this.configs.length; idxCfg += 1) {
                const cfg = this.configs[idxCfg];
                if (cfg.isDone) continue;

                workerPool.runTask(
                    {
                        pgnChunk: chunk.text,
                        idxConfig: idxCfg,
                        readInHeader: this.readInHeader,
                    },
                    (err: Error, result: WorkerMessage) => this.addDataFromWorker(err, result),
                );
            }

            if (this.configs.every((cfg) => cfg.isDone)) break chunkLoop;
        }

        workerPool.flagNotifyWhenDone = true;
        await EventEmitter.once(workerPool, 'done');
        await workerPool.close();

        return this.finishProcessing();
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
                availableParallelism(),
                `${__dirname}/chess-worker.js`,
                workerInitData,
            );
        }

        const gameStore: Game[][] = this.configs.map(() => [] as Game[]);
        const gameParser = new GameParser();
        const lineParser = new GameLineParser({ readInHeader: this.readInHeader });
        const legacyBatchSize = this.multithreadConfig?.batchSize ?? 200;

        lineLoop: for await (const line of readLinesFast(path)) {
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
                                    pgnChunk: this.gamesToPgnChunk(gameStore[idxCfg]),
                                    idxConfig: idxCfg,
                                    readInHeader: this.readInHeader,
                                },
                                (err: Error, result: WorkerMessage) =>
                                    this.addDataFromWorker(err, result),
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
            for (const [idx, games] of gameStore.entries()) {
                if (games.length > 0) {
                    workerPool.runTask(
                        {
                            pgnChunk: this.gamesToPgnChunk(games),
                            idxConfig: idx,
                            readInHeader: this.readInHeader,
                        },
                        (err: Error, result: WorkerMessage) => this.addDataFromWorker(err, result),
                    );
                }
            }
            workerPool.flagNotifyWhenDone = true;
            await EventEmitter.once(workerPool, 'done');
            await workerPool.close();
        }

        return this.finishProcessing();
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
    private addDataFromWorker(err: Error, result: WorkerMessage) {
        if (err) throw err;

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
