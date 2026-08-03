import type { PgnChunkConfig } from '#io/pgn-chunks';
import type { ReplayMode } from '#replay/replay-mode';
import type { AnalyzeError } from '#types/errors';
import type { ParsedGame } from '#types/parse-pgn';
import type { TrackerInstance } from '#types/tracker';

/** Per-game predicate for single-threaded analysis (`workers: false`). */
export type GameFilter = (game: ParsedGame) => boolean;

/** Options for one analysis run. */
export interface AnalyzeRun {
    /** Tracker instances for this run (from factory calls, e.g. `tileTracker()`). */
    trackers?: TrackerInstance[];
    /**
     * Per-game predicate. Requires `workers: false` — JavaScript filters run on the main thread only.
     */
    filter?: GameFilter;
    /**
     * Maximum number of games to process. Default unlimited.
     */
    maxGames?: number;
}

/** Worker thread pool and PGN chunking. Pass `false` via `workers` to disable. */
export interface WorkerOptions {
    /** Worker thread count. Defaults to `os.availableParallelism()`. */
    workerCount?: number;
    /** Advanced: PGN chunk sizing for worker dispatch. */
    chunk?: PgnChunkConfig;
}

interface AnalyzeSharedFields {
    /**
     * Parse tag-pair headers. Default `'auto'` infers from game trackers.
     * `false` disables header parsing; throws when a game tracker is present.
     */
    headers?: boolean | 'auto';
    /**
     * Board replay mode. Default inferred from trackers.
     * Throws when a manual override is not compatible with the tracker configuration.
     */
    replay?: ReplayMode;
    /** Default: multithreaded with library defaults. `false` = single-threaded. */
    workers?: false | WorkerOptions;
    /**
     * Replay error policy per game. Does not apply to PGN structural parse failures.
     * Default `'abort'` stops on the first bad game; `'skip-game'` continues and collects errors.
     */
    onError?: 'abort' | 'skip-game';
}

/**
 * Options passed to `analyzePGN`: shared fields plus either a single run
 * (top-level `trackers` / `filter` / `maxGames` sugar) or explicit `runs`.
 */
export type AnalyzeOptions = AnalyzeSharedFields &
    (AnalyzeRun | { runs: [AnalyzeRun, ...AnalyzeRun[]] });

/** Per-run counters and tracker results returned from `analyzePGN`. */
export interface AnalyzeRunResult {
    /** Games processed in this run (after filter / maxGames). */
    gameCount: number;
    /** Half-moves replayed or counted in this run. */
    moveCount: number;
    /**
     * Tracker instances for this run (same object identities passed in).
     * Prefer reading state from the instance handles you created (`tiles.state`).
     */
    trackers: TrackerInstance[];
}

/** Result from `analyzePGN`. Always contains one {@link AnalyzeRunResult} per run. */
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
    /** Games skipped due to replay failure when `onError: 'skip-game'`. */
    skippedGames?: number;
    /** Collected replay errors when `onError: 'skip-game'` (capped at 100). */
    errors?: AnalyzeError[];
    /** True when more than 100 replay errors occurred and {@link errors} was truncated. */
    errorsTruncated?: boolean;
    /** One entry per run (length 1 for single-run calls). */
    runs: AnalyzeRunResult[];
}
