import { EventEmitter } from 'node:events';
import { availableParallelism } from 'node:os';
import { join } from 'node:path';

import { normalizeAnalysisConfigs } from '#core/analysis-config';
import { createWorkerResultHandler, finishTrackers } from '#core/tracker-merge';
import WorkerPool from '#core/worker-pool';
import { GameAssembler } from '#pgn/game-assembler';
import { readLinesFast } from '#pgn/line-reader';
import { readPgnChunks } from '#pgn/pgn-chunks';
import GameReplayer from '#replay/game-replayer';
import { resolveReplayPolicy } from '#replay/replay-policy';
import type { AnalysisConfig, GameAndMoveCount, MultithreadConfig } from '#types/analysis';
import type { GameProcessorAnalysisConfigFull } from '#types/analysis-runtime';
import type { WorkerInitData, WorkerTaskData } from '#types/worker';

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
    readonly onError: 'abort' | 'skip-game';

    constructor(
        configs: AnalysisConfig[],
        multithreadCfg: MultithreadConfig | null,
        onError: 'abort' | 'skip-game' = 'abort',
    ) {
        const normalized = normalizeAnalysisConfigs(configs, multithreadCfg);
        this.configs = normalized.configs;
        this.readInHeader = normalized.readInHeader;
        this.multithreadConfig = multithreadCfg;
        this.onError = onError;
    }

    /**
     * Main function for parsing and analyzing.
     * @param path Path to the PGN file.
     * @returns Count of processed games and moves.
     */
    async processPGN(path: string): Promise<GameAndMoveCount[]> {
        if (this.multithreadConfig !== null) {
            return this.processPGNWithWorkers(path);
        }

        return this.processPGNOnMainThread(path);
    }

    private async processPGNWithWorkers(path: string): Promise<GameAndMoveCount[]> {
        const workerInitData: WorkerInitData = {
            configs: this.configs.map((cfg) => ({
                trackerData: cfg.trackerData,
                parseOnly: cfg.config.hasFilter,
            })),
            onError: this.onError,
        };
        const workerPool = new WorkerPool(this.resolveWorkerCount(), WORKER_PATH, workerInitData);

        const chunkConfig = {
            targetBytes: this.multithreadConfig!.targetBytes,
            maxLines: this.multithreadConfig!.maxLines,
            minLines: this.multithreadConfig!.minLines,
        };

        const gameReplayer = new GameReplayer();

        // Track the first worker failure and unblock any wait on pool completion.
        // Without this, a thrown callback error leaves the pool waiting forever on 'done'.
        let fatalError: Error | undefined;
        let rejectFatal: ((err: Error) => void) | undefined;
        const fatalPromise = new Promise<never>((_, reject) => {
            rejectFatal = reject;
        });

        const handleWorkerResult = createWorkerResultHandler(
            this.configs,
            (err) => {
                fatalError = err;
                rejectFatal?.(err);
            },
            { gameReplayer, onError: this.onError },
        );

        try {
            chunkLoop: for await (const chunk of readPgnChunks(path, chunkConfig)) {
                if (fatalError) break;

                for (const [idxConfig, cfg] of this.configs.entries()) {
                    if (cfg.isDone) continue;

                    if (!cfg.config.hasFilter && cfg.config.cntGames !== Infinity) {
                        const remaining = cfg.config.cntGames - cfg.processedGames;
                        if (remaining <= 0) continue;
                    }

                    // Only one config: transfer original (zero-copy)
                    // Multiple configs: slice() so each gets its own buffer;
                    // avoids detaching the underlying buffer
                    const pgnChunkBytes =
                        this.configs.length > 1 ? chunk.bytes.slice() : chunk.bytes;

                    const task: WorkerTaskData = {
                        pgnChunkBytes,
                        idxConfig,
                        readInHeader: cfg.config.hasFilter ? true : this.readInHeader,
                    };

                    if (!cfg.config.hasFilter && cfg.config.cntGames !== Infinity) {
                        task.remainingGames = cfg.config.cntGames - cfg.processedGames;
                    }

                    workerPool.runTask(task, handleWorkerResult);
                }

                if (this.configs.every((c) => c.isDone)) break chunkLoop;
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

    private async processPGNOnMainThread(path: string): Promise<GameAndMoveCount[]> {
        const gameReplayer = new GameReplayer();
        const gameAssembler = new GameAssembler({ readInHeader: this.readInHeader });

        lineLoop: for await (const line of readLinesFast(path)) {
            const game = gameAssembler.processLine(line);
            if (!game) continue;

            for (const cfg of this.configs) {
                if (!cfg.isDone && (!cfg.config.hasFilter || cfg.config.filter(game))) {
                    cfg.cntReadGames += 1;
                    gameReplayer.processGame(
                        game,
                        cfg,
                        resolveReplayPolicy(cfg.trackers.move.length > 0),
                        cfg.processedGames + cfg.skippedGames,
                        this.onError,
                    );
                    if (cfg.cntReadGames === cfg.config.cntGames) {
                        cfg.isDone = true;
                        if (this.configs.every((c) => c.isDone)) break lineLoop;
                    }
                }
            }
        }

        return finishTrackers(this.configs);
    }

    private resolveWorkerCount(): number {
        const configured = this.multithreadConfig?.workerCount;
        if (configured !== undefined) return Math.max(1, configured);
        return availableParallelism();
    }
}

export default GameProcessor;
