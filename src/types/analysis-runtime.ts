import type { AnalyzeError } from '#types/errors';
import type { Game } from '#types/game';
import type { Tracker, TrackerConfig } from '#types/tracker';

/** @internal Legacy processor input — normalized from {@link AnalyzeOptions}. */
export interface AnalysisConfig {
    trackers?: Tracker[];
    config?: {
        maxGames?: number;
        filter?: (game: Game) => boolean;
    };
}

/** @internal Multithread chunking. `null` disables worker threads. */
export interface MultithreadConfig {
    targetBytes?: number;
    workerCount?: number;
    maxLines?: number;
    minLines?: number;
}

/** @internal Raw game/move counters from the processor. */
export interface GameAndMoveCount {
    games: number;
    moves: number;
    skippedGames?: number;
    errors?: AnalyzeError[];
}

/** Normalized per-config processor state (filter, game limit). */
export interface GameProcessorConfig {
    hasFilter: boolean;
    filter: (game: Game) => boolean;
    maxGames: number;
}

/** Runtime tracker buckets while processing one analysis config. */
export interface GameProcessorAnalysisConfig {
    trackers: { move: Tracker[]; game: Tracker[] };
    processedMoves: number;
    processedGames: number;
    skippedGames: number;
    errors: AnalyzeError[];
}

/** Main-thread processor config including serializable tracker metadata for workers. */
export interface GameProcessorAnalysisConfigFull extends GameProcessorAnalysisConfig {
    config: GameProcessorConfig;
    trackerData: { id: string; cfg: TrackerConfig; path: string }[];
    replayMode: import('#replay/replay-policy').ReplayMode;
    readGames: number;
    isDone: boolean;
}
