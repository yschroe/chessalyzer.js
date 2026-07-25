import type { Tracker, TrackerConfig } from './tracker';

/** User-facing analysis configuration passed to {@link Chessalyzer.analyzePGN}. */
export interface AnalysisConfig {
    trackers?: Tracker[];
    config?: {
        cntGames?: number;
        filter?: (data: unknown) => boolean;
    };
}

/** Multithread batching options. `null` disables worker threads. */
export interface MultithreadConfig {
    batchSize: number;
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
