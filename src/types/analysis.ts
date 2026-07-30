import type { PgnChunkConfig } from '#io/pgn-chunks';
import type { ReplayMode } from '#replay/replay-mode';
import type { AnalyzeError } from '#types/errors';
import type { ParsePgnOptions, ParsedGame } from '#types/parse-pgn';
import type { Tracker } from '#types/tracker';

/** Options for a single analysis run. */
export interface AnalyzeRun {
    trackers?: Tracker[];
    /**
     * Per-game predicate. Requires {@link AnalyzeSharedOptions.workers} `false` — JavaScript
     * filters run on the main thread only.
     */
    filter?: (game: ParsedGame) => boolean;
    maxGames?: number;
}

/** Worker thread pool and PGN chunking. Pass `false` via {@link AnalyzeOptions.workers} to disable. */
export interface WorkerOptions extends PgnChunkConfig {
    /** Worker thread count. Defaults to `os.availableParallelism()`. */
    workerCount?: number;
}

/** Replay legality policy. `'trust'` is the default (assume well-formed PGN). */
export type ReplayValidation = 'trust' | 'validate';

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
    /**
     * Replay legality policy. Default `'trust'` (today’s behavior). Sibling to {@link replay} —
     * does not change how moves are decoded, only whether legality is checked (future).
     * `'validate'` is reserved and not yet implemented.
     */
    validation?: ReplayValidation;
    /** Default: multithreaded with library defaults. `false` = single-threaded. */
    workers?: false | WorkerOptions;
    /**
     * Replay error policy per game. Does not apply to PGN structural parse failures.
     * Default `'abort'` stops on the first bad game; `'skip-game'` continues and collects errors.
     */
    onError?: 'abort' | 'skip-game';
}

/** Single-run {@link analyzePGN} options. */
interface AnalyzeSingleRunOptions extends AnalyzeSharedOptions {
    trackers?: Tracker[];
    /**
     * Per-game predicate. Requires `workers: false` — JavaScript filters run on the main thread only.
     */
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

/** Per-run counters and tracker instances returned from {@link analyzePGN}. */
export interface AnalyzeRunResult {
    /** Games processed in this run (after filter / maxGames). */
    gameCount: number;
    /** Half-moves replayed or counted in this run. */
    moveCount: number;
    /** Tracker instances passed for this run (stats accumulate in place on these refs). */
    trackers: Tracker[];
}

/** Unified result shape from {@link analyzePGN}. */
export interface AnalyzeResult {
    /** Wall time for the whole call in milliseconds. */
    durationMs: number;
    /**
     * Sum of {@link AnalyzeRunResult.gameCount} across runs.
     * With a single run, equals that run's processed game count. With multiple `runs`, sums each pass over the file.
     */
    gameCount: number;
    /** Sum of {@link AnalyzeRunResult.moveCount} across runs. */
    moveCount: number;
    /** Call-level throughput from total moves and {@link durationMs}. */
    movesPerSecond: number;
    /** One entry per run (length 1 when `runs` is omitted). */
    runs: AnalyzeRunResult[];
    /** Games skipped due to replay failure when `onError: 'skip-game'`. */
    skippedGames?: number;
    /** Collected replay errors when `onError: 'skip-game'` (capped at 100). */
    errors?: AnalyzeError[];
    /** Present when more than 100 replay errors occurred and {@link errors} was truncated. */
    errorsTruncated?: true;
}
