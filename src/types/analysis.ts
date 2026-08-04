import type { ReplayMode } from '#replay/replay-mode';
import type { AnalyzeError } from '#types/errors';
import type { ParsedGame } from '#types/parse-pgn';
import type { TrackerInstance } from '#types/tracker';

/** Per-game predicate for single-threaded analysis (`workers: false` only). */
export type GameFilter = (game: ParsedGame) => boolean;

type TrackerList = readonly TrackerInstance[];

/** True when instance union `I` includes a tracker def with `kind: K`. */
type HasKind<I, K extends 'move' | 'game'> = [I] extends [never]
    ? false
    : I extends { def: { kind: K } }
      ? true
      : false;

type ReplayForInstances<I> = HasKind<I, 'move'> extends true ? 'actions' : ReplayMode;
type HeadersForInstances<I> = HasKind<I, 'game'> extends true ? true | 'auto' : boolean | 'auto';

/** Advanced: PGN chunk sizing for worker dispatch (`workers.chunk`). */
interface WorkerChunkOptions {
    /** Target chunk size in bytes before extending to the next game boundary. */
    targetBytes?: number;
    /** Safety cap on lines per chunk. */
    maxLines?: number;
    /** Minimum lines before a byte-target chunk may be emitted. */
    minLines?: number;
}

/** Worker thread pool and PGN chunking. Pass `false` via `workers` to disable. */
export interface WorkerOptions {
    /** Worker thread count. Defaults to `os.availableParallelism()`. */
    count?: number;
    /** Advanced: PGN chunk sizing for worker dispatch. */
    chunk?: WorkerChunkOptions;
}

type SingleThreadedWorkers = { workers: false };
type MultithreadedWorkers = { workers?: WorkerOptions | number; filter?: never };

type SharedAnalyzeFields<I> = {
    headers?: HeadersForInstances<I>;
    replay?: ReplayForInstances<I>;
    onError?: 'abort' | 'skip-game';
};

/** Per-run spec building block. */
interface AnalyzeRunBase {
    trackers?: TrackerList;
    maxGames?: number;
}

type AnalyzeRunWithFilter = AnalyzeRunBase & { filter?: GameFilter };
type AnalyzeRunNoFilter = AnalyzeRunBase & { filter?: never };

/** Options for one analysis run (filter allowed — requires `workers: false` on the call). */
export type AnalyzeRun = AnalyzeRunWithFilter;

/** Single-run `analyzePGN` options (top-level `trackers` / `filter` / `maxGames` sugar). */
export type SingleRunOptions<T extends TrackerList = TrackerInstance[]> = SharedAnalyzeFields<
    T[number]
> & {
    trackers?: T;
    maxGames?: number;
    runs?: never;
} & ((SingleThreadedWorkers & { filter?: GameFilter }) | MultithreadedWorkers);

type AllRunInstances<R extends readonly AnalyzeRunBase[]> = NonNullable<
    R[number]['trackers']
>[number];

/** Multi-run `analyzePGN` options when `workers: false` (per-run filters allowed). */
export type MultiRunOptions<R extends readonly [AnalyzeRunWithFilter, ...AnalyzeRunWithFilter[]]> =
    SharedAnalyzeFields<AllRunInstances<R>> &
        SingleThreadedWorkers & {
            runs: R;
            trackers?: never;
            filter?: never;
            maxGames?: never;
        };

/** Multi-run `analyzePGN` options with the default worker pool (no filters). */
export type MultiRunOptionsMT<R extends readonly [AnalyzeRunNoFilter, ...AnalyzeRunNoFilter[]]> =
    SharedAnalyzeFields<AllRunInstances<R>> &
        MultithreadedWorkers & {
            runs: R;
            trackers?: never;
            filter?: never;
            maxGames?: never;
        };

/**
 * Options passed to `analyzePGN`: shared fields plus either a single run
 * (top-level `trackers` / `filter` / `maxGames` sugar) or explicit `runs`.
 */
export type AnalyzeOptions =
    | SingleRunOptions
    | MultiRunOptions<readonly [AnalyzeRunWithFilter, ...AnalyzeRunWithFilter[]]>
    | MultiRunOptionsMT<readonly [AnalyzeRunNoFilter, ...AnalyzeRunNoFilter[]]>;

/** Per-run counters returned from `analyzePGN`. Tracker state lives on the instances you passed in. */
export interface AnalyzeRunResult {
    /** Games processed in this run (after filter / maxGames). */
    gameCount: number;
    /** Half-moves replayed or counted in this run. */
    moveCount: number;
    /** Games skipped in this run when `onError: 'skip-game'`. Omitted when zero. */
    skippedGames?: number;
    /** Replay errors collected in this run when `onError: 'skip-game'`. Omitted when empty. */
    errors?: AnalyzeError[];
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
    /**
     * One entry per run (length 1 for single-run calls).
     * Holds per-cohort counts only — read tracker state from the instances you created.
     */
    runs: AnalyzeRunResult[];
}
