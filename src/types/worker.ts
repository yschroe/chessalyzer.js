import type { AnalyzeError } from '#types/errors';
import type { Tracker, TrackerConfig } from '#types/tracker';

/** One-time worker bootstrap: tracker class names, cfg, optional module paths. */
export interface WorkerInitData {
    configs: {
        trackerData: { id: string; cfg: TrackerConfig; path?: string }[];
    }[];
    onError?: 'abort' | 'skip-game';
}

/** Per-batch payload sent main → worker (tracker config lives in workerData). */
export interface WorkerTaskData {
    /** UTF-8 PGN chunk; transferred zero-copy from main to worker. */
    pgnChunkBytes: Uint8Array;
    idxConfig: number;
    readInHeader: boolean;
}

/** Worker → main result: counts and optional tracker state to merge. */
export interface WorkerMessage {
    cntMoves: number;
    cntGames: number;
    idxConfig: number;
    gameTrackers?: Tracker[];
    moveTrackers?: Tracker[];
    skippedGames?: number;
    errors?: AnalyzeError[];
    /** Set when batch processing failed catastrophically; main thread should abort. */
    error?: string;
}
