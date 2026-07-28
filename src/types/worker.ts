import type { AnalyzeError } from '#types/errors';
import type { Game } from '#types/game';
import type { Tracker, TrackerConfig } from '#types/tracker';

/** One-time worker bootstrap: tracker class names, cfg, optional module paths. */
export interface WorkerInitData {
    configs: {
        trackerData: { id: string; cfg: TrackerConfig; path?: string }[];
        /** When true, worker assembles games and returns them for main-thread filter/replay. */
        pgnParseOnly?: boolean;
        replayMode: import('#replay/replay-mode').ReplayMode;
    }[];
    onError?: 'abort' | 'skip-game';
}

/** Per-batch payload sent main → worker (tracker config lives in workerData). */
export interface WorkerTaskData {
    /** UTF-8 PGN chunk; transferred zero-copy from main to worker. */
    pgnChunkBytes: Uint8Array;
    idxConfig: number;
    parseHeaders: boolean;
    /** Games still allowed for this config in replay mode (omit when unlimited). */
    remainingGames?: number;
}

/** Worker → main result: counts and optional tracker state to merge. */
export interface WorkerMessage {
    moves: number;
    games: number;
    idxConfig: number;
    gameTrackers?: Tracker[];
    moveTrackers?: Tracker[];
    skippedGames?: number;
    errors?: AnalyzeError[];
    /** Parsed games when {@link WorkerInitData.configs} entry has `pgnParseOnly: true`. */
    parsedGames?: Game[];
    /** Set when batch processing failed catastrophically; main thread should abort. */
    error?: string;
}
