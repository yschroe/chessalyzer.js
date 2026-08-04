import assert from 'node:assert';
import { availableParallelism } from 'node:os';
import { fileURLToPath } from 'node:url';

import type { NormalizedAnalyzeOptions } from '#core/analysis-config';
import type { GameAndMoveCount, GameProcessorConfig } from '#core/analysis-runtime';
import {
    createWorkerResultHandler,
    finishTrackers,
    mergeWorkerTrackerFlush,
} from '#core/tracker-merge';
import WorkerPool from '#core/worker-pool';
import type { WorkerBatchTask, WorkerInitData, WorkerTaskConfigEntry } from '#core/worker-types';
import { readLines } from '#io/line-reader';
import { readPgnChunks } from '#io/pgn-chunks';
import { GameAssembler } from '#pgn/game-assembler';
import { toParsedGame } from '#pgn/to-parsed-game';
import GameReplayer from '#replay/game-replayer';
import type { WorkerOptions } from '#types/analysis';
import type { ParsedGame } from '#types/parse-pgn';

/** Path to the worker file. */
const WORKER_PATH = fileURLToPath(new URL('chess-worker.js', import.meta.url));

/**
 * Orchestrates PGN I/O, optional worker dispatch, SAN replay, and tracker merge.
 * Config normalization and merge helpers live in sibling modules.
 */
class GameProcessor {
    configs: GameProcessorConfig[];
    parseHeaders: boolean;
    multithreadConfig: WorkerOptions | null;
    readonly onError: 'abort' | 'skip-game';

    constructor(normalized: NormalizedAnalyzeOptions) {
        this.configs = normalized.configs;
        this.parseHeaders = normalized.parseHeaders;
        this.multithreadConfig = normalized.multithreadCfg;
        this.onError = normalized.onError;
    }

    /**
     * Main function for parsing and analyzing.
     * @param path Path to the PGN file.
     * @returns Count of processed games and moves.
     */
    async processPGN(path: string): Promise<GameAndMoveCount[]> {
        if (!this.multithreadConfig) {
            return this.processPGNOnMainThread(path);
        }

        return this.processPGNWithWorkers(path);
    }

    /** Process PGN on the main thread. */
    private async processPGNOnMainThread(path: string): Promise<GameAndMoveCount[]> {
        const gameReplayer = new GameReplayer();
        const gameAssembler = new GameAssembler({ parseHeaders: this.parseHeaders });

        // Read in lines and process them one by one.
        // Runs until `false` is returned by the handler.
        await readLines(path, (line) => {
            const game = gameAssembler.processLine(line);
            // Continue with the next line if no full game was read-in yet.
            if (!game) return;

            let parsedGame: ParsedGame | undefined;

            for (const cfg of this.configs) {
                if (cfg.isDone) continue;

                const filter = cfg.limits.filter;
                if (filter) {
                    parsedGame ??= toParsedGame(game);
                    if (!filter(parsedGame)) continue;
                }

                parsedGame = gameReplayer.processGame(
                    game,
                    cfg,
                    cfg.replayMode,
                    cfg.processedGames + cfg.skippedGames,
                    this.onError,
                    parsedGame,
                );
                // maxGames caps attempts (accepted games), so skipped games count toward it.
                if (cfg.processedGames + cfg.skippedGames >= cfg.limits.maxGames) {
                    cfg.isDone = true;
                    if (this.configs.every((c) => c.isDone)) return false;
                }
            }

            return;
        });

        return finishTrackers(this.configs);
    }

    /** Process PGN with worker threads. */
    private async processPGNWithWorkers(path: string): Promise<GameAndMoveCount[]> {
        assert(this.multithreadConfig, 'Multithread configuration is required');

        const workerInitData: WorkerInitData = {
            configs: this.configs.map((cfg) => ({
                trackerSpecs: cfg.trackerSpecs ?? [],
                replayMode: cfg.replayMode,
            })),
            onError: this.onError,
        };
        const workerPool = new WorkerPool(this.resolveWorkerCount(), WORKER_PATH, workerInitData);

        const chunkConfig = this.multithreadConfig.chunk ?? {};

        const handler = createWorkerResultHandler(this.configs, (err) => {
            workerPool.fail(err);
        });

        try {
            chunkLoop: for await (const chunk of readPgnChunks(path, chunkConfig)) {
                if (workerPool.failed) break;

                const taskConfigs: WorkerTaskConfigEntry[] = [];

                for (const [idxConfig, cfg] of this.configs.entries()) {
                    if (cfg.isDone) continue;

                    const entry: WorkerTaskConfigEntry = {
                        idxConfig,
                        parseHeaders: this.parseHeaders,
                    };

                    if (cfg.limits.maxGames !== Infinity) {
                        // maxGames caps attempts (accepted games), so skipped games count toward it.
                        const remaining =
                            cfg.limits.maxGames - (cfg.processedGames + cfg.skippedGames);
                        if (remaining <= 0) continue;
                        entry.remainingGames = remaining;
                    }

                    taskConfigs.push(entry);
                }

                if (taskConfigs.length === 0) {
                    if (this.configs.every((c) => c.isDone)) break chunkLoop;
                    continue;
                }

                const task: WorkerBatchTask = {
                    type: 'batch',
                    pgnChunkBytes: chunk.bytes,
                    configs: taskConfigs,
                };

                void workerPool.runTask(task).then(handler.onResult, handler.onError);

                if (this.configs.every((c) => c.isDone)) break chunkLoop;
            }

            // Throws the first fatal worker/task/merge error, if any.
            await workerPool.drain();

            const flushResults = await workerPool.flush();
            for (const flushResult of flushResults) {
                mergeWorkerTrackerFlush(this.configs, flushResult);
            }

            return finishTrackers(this.configs);
        } finally {
            // Always terminate workers so the process can exit after success or failure.
            await workerPool.close();
        }
    }

    /** Resolve the number of worker threads to use. */
    private resolveWorkerCount(): number {
        const configured = this.multithreadConfig?.count;
        if (configured !== undefined) return Math.max(1, configured);
        return availableParallelism();
    }
}

export default GameProcessor;
