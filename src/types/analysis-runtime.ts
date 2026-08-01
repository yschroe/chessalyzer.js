import type { ReplayMode } from '#replay/replay-mode';
import type { BaseGameTracker, MoveTracker } from '#trackers/base-tracker';
import type { AnalyzeError } from '#types/errors';
import type { ParsedGame } from '#types/parse-pgn';
import type { TrackerConfig } from '#types/tracker';

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
    filter: (game: ParsedGame) => boolean;
    maxGames: number;
}

/** Runtime tracker buckets while processing one analysis config. */
export interface GameProcessorAnalysisConfig {
    trackers: { move: MoveTracker[]; game: BaseGameTracker[] };
    processedMoves: number;
    processedGames: number;
    skippedGames: number;
    errors: AnalyzeError[];
}

/** Main-thread processor config including serializable tracker metadata for workers. */
export interface GameProcessorAnalysisConfigFull extends GameProcessorAnalysisConfig {
    config: GameProcessorConfig;
    trackerData: { id: string; cfg: TrackerConfig; path: string }[];
    replayMode: ReplayMode;
    readGames: number;
    isDone: boolean;
}
