import type { AnalyzeError } from '#types/errors';
import type { Game } from '#types/game';
import type { Tracker } from '#types/tracker';

/** Options for a single filtered analysis run. */
export interface AnalyzeRun {
    trackers?: Tracker[];
    filter?: (game: Game) => boolean;
    maxGames?: number;
}

/** Worker thread chunking options. Pass `false` via {@link AnalyzeOptions.workers} to disable. */
export interface WorkerOptions {
    /** Target raw PGN chunk size in bytes before aligning to a game boundary. */
    targetBytes?: number;
    /** Worker thread count. Defaults to `os.availableParallelism()`. */
    workerCount?: number;
    /** Safety cap on lines per chunk. */
    maxLines?: number;
    /** Minimum lines before a byte-target chunk may be emitted. */
    minLines?: number;
}

/** Options passed to {@link analyzePGN}. */
export interface AnalyzeOptions {
    trackers?: Tracker[];
    filter?: (game: Game) => boolean;
    maxGames?: number;
    /**
     * Parallel filtered analyses of the same file.
     * Top-level trackers/filter/maxGames are ignored when set.
     */
    runs?: AnalyzeRun[];
    /** Default: multithreaded with library defaults. `false` = single-threaded. */
    workers?: false | WorkerOptions;
    /**
     * How to handle replay/parse failures per game.
     * Default `'abort'` stops on the first bad game; `'skip-game'` continues and collects errors.
     */
    onError?: 'abort' | 'skip-game';
}

/** Per-run counters returned from {@link analyzePGN}. */
export interface AnalyzeRunResult {
    games: number;
    moves: number;
    movesPerSecond: number;
}

/** Unified result shape from {@link analyzePGN}. */
export interface AnalyzeResult {
    /** Wall time for the whole call in milliseconds. */
    durationMs: number;
    /** Sum across runs. */
    games: number;
    moves: number;
    movesPerSecond: number;
    /** One entry per run (length 1 when `runs` is omitted). */
    runs: AnalyzeRunResult[];
    /** Games skipped due to replay failure when `onError: 'skip-game'`. */
    skippedGames?: number;
    /** First {@link MAX_COLLECTED_ERRORS} collected errors (skip-game or partial failure). */
    errors?: AnalyzeError[];
}

/** @internal Legacy processor input — normalized from {@link AnalyzeOptions}. */
export interface AnalysisConfig {
    trackers?: Tracker[];
    config?: {
        cntGames?: number;
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
    cntGames: number;
    cntMoves: number;
    skippedGames?: number;
    errors?: AnalyzeError[];
}
