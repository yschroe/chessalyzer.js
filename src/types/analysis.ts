import type { Tracker, TrackerConfig } from './tracker';

/** User-facing analysis configuration passed to {@link Chessalyzer.analyzePGN}. */
export interface AnalysisConfig {
    trackers?: Tracker[];
    config?: {
        cntGames?: number;
        filter?: (data: unknown) => boolean;
    };
}

/** Multithread chunking options. `null` disables worker threads. */
export interface MultithreadConfig {
    /** Target raw PGN chunk size in bytes before aligning to a game boundary. */
    targetBytes?: number;
    /** Safety cap on lines per chunk. */
    maxLines?: number;
    /** Minimum lines before a byte-target chunk may be emitted. */
    minLines?: number;
    /**
     * @deprecated Use `targetBytes` instead. Ignored by the worker-side parse path.
     */
    batchSize?: number;
}

/** Normalized per-config processor state (filter, game limit). */
export interface GameProcessorConfig {
    hasFilter: boolean;
    filter: (game: object) => boolean;
    cntGames: number;
}

/** Runtime tracker buckets while processing one analysis config. */
export interface GameProcessorAnalysisConfig {
    trackers: { move: Tracker[]; game: Tracker[] };
    processedMoves: number;
    processedGames: number;
}

/** Main-thread processor config including serializable tracker metadata for workers. */
export interface GameProcessorAnalysisConfigFull extends GameProcessorAnalysisConfig {
    config: GameProcessorConfig;
    trackerData: { name: string; cfg: TrackerConfig; path: string }[];
    cntReadGames: number;
    isDone: boolean;
}

/** Counters emitted by move trackers for one game or merged batch. */
export interface GameAndMoveCount {
    cntGames: number;
    cntMoves: number;
}

/** {@link GameAndMoveCount} plus throughput from analyzePGN. */
export interface GameAndMoveCountFull extends GameAndMoveCount {
    mps: number;
}
