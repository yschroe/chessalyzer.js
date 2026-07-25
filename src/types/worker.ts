import type { Tracker, TrackerConfig } from '#types/tracker';

/** One-time worker bootstrap: tracker class names, cfg, optional module paths. */
export interface WorkerInitData {
    configs: {
        trackerData: { name: string; cfg: TrackerConfig; path?: string }[];
    }[];
}

/** Per-batch payload sent main → worker (tracker config lives in workerData). */
export interface WorkerTaskData {
    /** UTF-8 PGN chunk; transferred zero-copy from main to worker. */
    pgnChunkBytes: Uint8Array;
    idxConfig: number;
    readInHeader: boolean;
    maxGames?: number;
}

/** Worker → main result: counts and optional tracker state to merge. */
export interface WorkerMessage {
    cntMoves: number;
    cntGames: number;
    idxConfig: number;
    gameTrackers?: Tracker[];
    moveTrackers?: Tracker[];
    /** Set when batch processing failed in the worker; main thread should abort. */
    error?: string;
}

export type { Tracker, TrackerConfig };
