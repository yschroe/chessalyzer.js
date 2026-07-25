import type { Tracker, TrackerConfig } from './tracker';

/** One-time worker bootstrap: tracker class names, cfg, optional module paths. */
export interface WorkerInitData {
    configs: {
        trackerData: { name: string; cfg: TrackerConfig; path?: string }[];
    }[];
}

/** Per-batch payload sent main → worker (tracker config lives in workerData). */
export interface WorkerTaskData {
    pgnChunk: string;
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
}

export type { Tracker, TrackerConfig };
