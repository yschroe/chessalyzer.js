import { EventEmitter } from 'node:events';
import { availableParallelism } from 'node:os';
import { join } from 'node:path';

import { normalizeAnalysisConfigs } from '#core/analysis-config';
import { createWorkerResultHandler, finishTrackers } from '#core/tracker-merge';
import WorkerPool from '#core/worker-pool';
import { GameAssembler } from '#pgn/game-assembler';
import { gamesToPgnChunk } from '#pgn/games-to-pgn';
import { readLinesFast } from '#pgn/line-reader';
import { encodePgnChunkText, readPgnChunks } from '#pgn/pgn-chunks';
import GameReplayer from '#replay/game-replayer';
import { resolveReplayPolicy } from '#replay/replay-policy';
import type { AnalysisConfig, GameAndMoveCount, MultithreadConfig } from '#types/analysis';
import type { GameProcessorAnalysisConfigFull } from '#types/analysis-runtime';
import type { Game } from '#types/game';
import type { WorkerInitData } from '#types/worker';

/** Path to the worker file. */
const WORKER_PATH = join(import.meta.dirname, 'chess-worker.js');

/**
 * Orchestrates PGN I/O, optional worker dispatch, SAN replay, and tracker merge.
 * Config normalization and merge helpers live in sibling modules.
 */
class GameProcessor {
    configs: GameProcessorAnalysisConfigFull[];
    readInHeader: boolean;
    multithreadConfig: MultithreadConfig | null;
    useWorkerParse: boolean;

    constructor(configs: AnalysisConfig[], multithreadCfg: MultithreadConfig | null) {
        const normalized = normalizeAnalysisConfigs(configs, multithreadCfg);
        this.configs = normalized.configs;
        this.readInHeader = normalized.readInHeader;
        this.useWorkerParse = normalized.useWorkerParse;
        this.multithreadConfig = multithreadCfg;
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

        const handleWorkerResult = createWorkerResultHandler(this.configs, (err) => {
            fatalError = err;
            rejectFatal?.(err);
        });

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

            return finishTrackers(this.configs);
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
        const gameReplayer = new GameReplayer();
        const gameAssembler = new GameAssembler({ readInHeader: this.readInHeader });
        const legacyBatchSize = this.multithreadConfig?.batchSize ?? 200;
        const pgnOptions = { includeHeaders: this.readInHeader };

        // Same fatal-error handling as processPGNWithWorkerParse (see above).
        let fatalError: Error | undefined;
        let rejectFatal: ((err: Error) => void) | undefined;
        const fatalPromise = new Promise<never>((_, reject) => {
            rejectFatal = reject;
        });

        const handleWorkerResult = createWorkerResultHandler(this.configs, (err) => {
            fatalError = err;
            rejectFatal?.(err);
        });

        try {
            lineLoop: for await (const line of readLinesFast(path)) {
                if (fatalError) break;

                const game = gameAssembler.processLine(line);
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
                                            gamesToPgnChunk(gamesForCfg, pgnOptions),
                                        ),
                                        idxConfig: idxCfg,
                                        readInHeader: this.readInHeader,
                                    },
                                    handleWorkerResult,
                                );

                                gameStore[idxCfg] = [];
                            }
                        } else if (!isMultithreaded) {
                            gameReplayer.processGame(
                                game,
                                cfg,
                                resolveReplayPolicy(cfg.trackers.move.length > 0),
                            );
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
                                pgnChunkBytes: encodePgnChunkText(gamesToPgnChunk(games, pgnOptions)),
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

            return finishTrackers(this.configs);
        } finally {
            if (workerPool) await workerPool.close();
        }
    }

    private resolveWorkerCount(): number {
        const configured = this.multithreadConfig?.workerCount;
        if (configured !== undefined) return Math.max(1, configured);
        return availableParallelism();
    }
}

export default GameProcessor;
