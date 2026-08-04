import type { TrackerSpec } from '#core/analysis-runtime';
import type { ReplayMode } from '#replay/replay-mode';
import type { AnalyzeError } from '#types/errors';

/** Plain state snapshot sent worker → main at pool drain (keyed by run-local index). */
export interface TrackerSnapshot {
    index: number;
    state: unknown;
}

/** One-time worker bootstrap: tracker ids, options, optional module paths. */
export interface WorkerInitData {
    configs: {
        trackerSpecs: TrackerSpec[];
        replayMode: ReplayMode;
    }[];
    onError?: 'abort' | 'skip-game';
}

/** One analysis config bundled into a chunk task. */
export interface WorkerTaskConfigEntry {
    idxConfig: number;
    parseHeaders: boolean;
    /** Games still allowed for this config in replay mode (omit when unlimited). */
    remainingGames?: number;
}

/** Per-batch payload sent main → worker (tracker config lives in workerData). */
export interface WorkerBatchTask {
    type: 'batch';
    /** UTF-8 PGN chunk; transferred zero-copy from main to worker. */
    pgnChunkBytes: Uint8Array;
    configs: WorkerTaskConfigEntry[];
}

/** Request accumulated tracker state from a worker at pool drain. */
interface WorkerFlushTask {
    type: 'flush';
}

export type WorkerTaskData = WorkerBatchTask | WorkerFlushTask;

/** Per-config slice of a worker batch result (counters only; tracker state flushes at drain). */
export interface WorkerBatchConfigResult {
    idxConfig: number;
    moves: number;
    games: number;
    skippedGames?: number;
    errors?: AnalyzeError[];
}

/** Per-config slice of a worker flush result (accumulated tracker state at pool drain). */
interface WorkerFlushConfigResult {
    idxConfig: number;
    trackerSnapshots: TrackerSnapshot[];
}

export type WorkerConfigResult = WorkerBatchConfigResult | WorkerFlushConfigResult;

/** Worker → main result: one or more config results, or a batch-level error. */
export interface WorkerMessage {
    results: WorkerConfigResult[];
    /** Set when batch processing failed catastrophically; main thread should abort. */
    error?: string;
}
