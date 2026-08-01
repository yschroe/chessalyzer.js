import type { ReplayMode } from '#replay/replay-mode';
import type { AnalyzeError } from '#types/errors';
import type { AssembledGame } from '#types/parse-pgn';
import type { TrackerSnapshot } from '#types/tracker';

/** One-time worker bootstrap: tracker ids, options, optional module paths. */
export interface WorkerInitData {
    configs: {
        trackerData: { id: string; module?: string; options?: unknown }[];
        /** When true, worker assembles games and returns them for main-thread filter/replay. */
        pgnParseOnly?: boolean;
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
    /** UTF-8 PGN chunk; transferred zero-copy from main to worker. */
    pgnChunkBytes: Uint8Array;
    configs: WorkerTaskConfigEntry[];
}

/** Request accumulated tracker state from a worker at pool drain. */
export interface WorkerFlushTask {
    type: 'flush';
}

export type WorkerTaskData = WorkerBatchTask | WorkerFlushTask;

/** Per-config slice of a worker batch or flush result. */
export interface WorkerConfigResult {
    idxConfig: number;
    moves: number;
    games: number;
    trackerSnapshots?: TrackerSnapshot[];
    skippedGames?: number;
    errors?: AnalyzeError[];
    /** Parsed games when {@link WorkerInitData.configs} entry has `pgnParseOnly: true`. */
    parsedGames?: AssembledGame[];
}

/** Worker → main result: one or more config results, or a batch-level error. */
export interface WorkerMessage {
    results: WorkerConfigResult[];
    /** Set when batch processing failed catastrophically; main thread should abort. */
    error?: string;
}

/** Type guard for {@link WorkerFlushTask}. */
export function isWorkerFlushTask(task: WorkerTaskData): task is WorkerFlushTask {
    return 'type' in task && task.type === 'flush';
}
