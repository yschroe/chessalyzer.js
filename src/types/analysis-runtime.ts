import type { Tracker, TrackerConfig } from '#types/tracker';

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
