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

/** Immutable per-run filter / game-cap settings. */
interface AnalyzeRunLimits {
    filter?: (game: ParsedGame) => boolean;
    maxGames: number;
}

/** Spec for constructing a tracker instance in a worker (id + factory module + options). */
export interface TrackerSpec {
    id: string;
    module?: string;
    options?: unknown;
}

/** Mutable per-run processing state (shared by GameReplayer and worker cache). */
export interface AnalyzeRunState {
    trackerHost: TrackerHost;
    processedMoves: number;
    processedGames: number;
    skippedGames: number;
    errors: AnalyzeError[];
}

/** Main-thread per-run: limits + live state + worker bootstrap metadata. */
export interface GameProcessorConfig extends AnalyzeRunState {
    limits: AnalyzeRunLimits;
    /** Present only when multithreaded; used to bootstrap worker tracker instances. */
    trackerSpecs?: TrackerSpec[];
    replayMode: ReplayMode;
    /** True once maxGames attempts (accepted + skipped) are exhausted. */
    isDone: boolean;
}
