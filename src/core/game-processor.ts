import { EventEmitter } from 'node:events';
import { availableParallelism } from 'node:os';
import { join } from 'node:path';

import { normalizeAnalysisConfigs, type NormalizeAnalysisOptions } from '#core/analysis-config';
import {
    createWorkerResultHandler,
    finishTrackers,
    mergeWorkerTrackerFlush,
} from '#core/tracker-merge';
import WorkerPool from '#core/worker-pool';
import { readLines } from '#io/line-reader';
import { readPgnChunks } from '#io/pgn-chunks';
import { GameAssembler } from '#pgn/game-assembler';
import GameReplayer from '#replay/game-replayer';
import type {
    AnalysisConfig,
    GameAndMoveCount,
    GameProcessorAnalysisConfigFull,
    MultithreadConfig,
} from '#types/analysis-runtime';
import type { WorkerBatchTask, WorkerInitData, WorkerTaskConfigEntry } from '#types/worker';

/** Path to the worker file. */
const WORKER_PATH = join(import.meta.dirname, 'chess-worker.js');

interface FatalErrorGate {
    fatalPromise: Promise<never>;
    onFatal: (err: Error) => void;
    getFatalError: () => Error | undefined;
}

/** Track the first worker/callback failure and unblock pool completion waits. */
function createFatalErrorGate(): FatalErrorGate {
    let fatalError: Error | undefined;
    let rejectFatal: ((err: Error) => void) | undefined;
    const fatalPromise = new Promise<never>((_, reject) => {
        rejectFatal = reject;
    });

    return {
        fatalPromise,
        onFatal: (err: Error) => {
            fatalError = err;
            rejectFatal?.(err);
        },
        getFatalError: () => fatalError,
    };
}

/** Wait for worker pool drain, racing against the first fatal callback error. */
async function awaitWorkerPoolDone(workerPool: WorkerPool, gate: FatalErrorGate): Promise<void> {
    const fatalError = gate.getFatalError();
    if (fatalError) throw fatalError;

    workerPool.flagNotifyWhenDone = true;
    await Promise.race([EventEmitter.once(workerPool, 'done'), gate.fatalPromise]);
}

/**
 * Orchestrates PGN I/O, optional worker dispatch, SAN replay, and tracker merge.
 * Config normalization and merge helpers live in sibling modules.
 */
class GameProcessor {
    configs: GameProcessorAnalysisConfigFull[];
    parseHeaders: boolean;
    multithreadConfig: MultithreadConfig | null;
    readonly onError: 'abort' | 'skip-game';

    constructor(
        configs: AnalysisConfig[],
        multithreadCfg: MultithreadConfig | null,
        onError: 'abort' | 'skip-game' = 'abort',
        normalizeOptions?: NormalizeAnalysisOptions,
    ) {
        const normalized = normalizeAnalysisConfigs(configs, multithreadCfg, normalizeOptions);
        this.configs = normalized.configs;
        this.parseHeaders = normalized.parseHeaders;
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
                pgnParseOnly: cfg.config.hasFilter,
                replayMode: cfg.replayMode,
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
        const gate = createFatalErrorGate();

        const handleWorkerResult = createWorkerResultHandler(this.configs, gate.onFatal, {
            gameReplayer,
            onError: this.onError,
        });

        try {
            chunkLoop: for await (const chunk of readPgnChunks(path, chunkConfig)) {
                if (gate.getFatalError()) break;

                const taskConfigs: WorkerTaskConfigEntry[] = [];

                for (const [idxConfig, cfg] of this.configs.entries()) {
                    if (cfg.isDone) continue;

                    if (!cfg.config.hasFilter && cfg.config.maxGames !== Infinity) {
                        const remaining = cfg.config.maxGames - cfg.processedGames;
                        if (remaining <= 0) continue;
                    }

                    const entry: WorkerTaskConfigEntry = {
                        idxConfig,
                        parseHeaders: cfg.config.hasFilter ? true : this.parseHeaders,
                    };

                    if (!cfg.config.hasFilter && cfg.config.maxGames !== Infinity) {
                        entry.remainingGames = cfg.config.maxGames - cfg.processedGames;
                    }

                    taskConfigs.push(entry);
                }

                if (taskConfigs.length === 0) {
                    if (this.configs.every((c) => c.isDone)) break chunkLoop;
                    continue;
                }

                const task: WorkerBatchTask = {
                    pgnChunkBytes: chunk.bytes,
                    configs: taskConfigs,
                };

                workerPool.runTask(task, handleWorkerResult);

                if (this.configs.every((c) => c.isDone)) break chunkLoop;
            }

            await awaitWorkerPoolDone(workerPool, gate);

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

    private async processPGNOnMainThread(path: string): Promise<GameAndMoveCount[]> {
        const gameReplayer = new GameReplayer();
        const gameAssembler = new GameAssembler({ parseHeaders: this.parseHeaders });

        await readLines(path, (line): void | false => {
            const game = gameAssembler.processLine(line);
            if (!game) return;

            for (const cfg of this.configs) {
                if (!cfg.isDone && (!cfg.config.hasFilter || cfg.config.filter(game))) {
                    cfg.readGames += 1;
                    gameReplayer.processGame(
                        game,
                        cfg,
                        cfg.replayMode,
                        cfg.processedGames + cfg.skippedGames,
                        this.onError,
                    );
                    if (cfg.readGames === cfg.config.maxGames) {
                        cfg.isDone = true;
                        if (this.configs.every((c) => c.isDone)) return false;
                    }
                }
            }
        });

        return finishTrackers(this.configs);
    }

    private resolveWorkerCount(): number {
        const configured = this.multithreadConfig?.workerCount;
        if (configured !== undefined) return Math.max(1, configured);
        return availableParallelism();
    }
}

export default GameProcessor;
