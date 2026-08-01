import type { TrackerHost } from '#core/tracker-host';
import type { ReplayMode } from '#replay/replay-mode';
import type { AnalyzeError } from '#types/errors';
import type { ParsedGame } from '#types/parse-pgn';

/** @internal Raw game/move counters from the processor. */
export interface GameAndMoveCount {
    games: number;
    moves: number;
    skippedGames?: number;
    errors?: AnalyzeError[];
}

/** Normalized per-config processor state (filter, game limit). */
interface GameProcessorConfig {
    filter?: (game: ParsedGame) => boolean;
    maxGames: number;
}

/** Runtime tracker host while processing one analysis config. */
export interface GameProcessorAnalysisConfig {
    trackerHost: TrackerHost;
    processedMoves: number;
    processedGames: number;
    skippedGames: number;
    errors: AnalyzeError[];
}

/** Main-thread processor config including serializable tracker metadata for workers. */
export interface GameProcessorAnalysisConfigFull extends GameProcessorAnalysisConfig {
    config: GameProcessorConfig;
    /** Serializable tracker metadata for worker bootstrap; set only when multithreaded. */
    trackerData?: { id: string; module?: string; options?: unknown }[];
    replayMode: ReplayMode;
    isDone: boolean;
}
