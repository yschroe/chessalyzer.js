import type { ReplayMode } from '#replay/replay-mode';
import type { AnalyzeError } from '#types/errors';
import type { ParsePgnOptions, ParsedGame } from '#types/parse-pgn';
import type { Tracker } from '#types/tracker';

/** Options for a single filtered analysis run. */
export interface AnalyzeRun {
    trackers?: Tracker[];
    filter?: (game: ParsedGame) => boolean;
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

/** Shared analyze options for single-run and multi-run calls. */
export interface AnalyzeSharedOptions extends Omit<ParsePgnOptions, 'headers'> {
    /**
     * Parse tag-pair headers. Default `'auto'` infers from game trackers.
     * `false` disables header parsing; throws when a game tracker is present.
     */
    headers?: boolean | 'auto';
    /**
     * Board replay mode. Default inferred from trackers (see {@link resolveReplayMode}).
     * Move trackers require `'actions'`.
     */
    replay?: ReplayMode;
    /** Default: multithreaded with library defaults. `false` = single-threaded. */
    workers?: false | WorkerOptions;
    /**
     * How to handle replay failures per game.
     * Default `'abort'` stops on the first bad game; `'skip-game'` continues and collects errors.
     */
    onError?: 'abort' | 'skip-game';
}

/** Single-run {@link analyzePGN} options. */
export interface AnalyzeSingleRunOptions extends AnalyzeSharedOptions {
    trackers?: Tracker[];
    filter?: (game: ParsedGame) => boolean;
    maxGames?: number;
    runs?: undefined;
}

/** Multi-run {@link analyzePGN} options. */
export interface AnalyzeMultiRunOptions extends AnalyzeSharedOptions {
    runs: [AnalyzeRun, ...AnalyzeRun[]];
}

/** Options passed to {@link analyzePGN}. */
export type AnalyzeOptions = AnalyzeSingleRunOptions | AnalyzeMultiRunOptions;

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
