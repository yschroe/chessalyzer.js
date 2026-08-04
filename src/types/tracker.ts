import type { Action } from '#types/actions';
import type { ParsedGame } from '#types/parse-pgn';

/** Shared lifecycle hooks for move and game tracker definitions. */
export interface TrackerDefBase<S = unknown, O = unknown> {
    readonly id: string;
    readonly kind: 'move' | 'game';
    /** Module URL for worker-side dynamic import of custom trackers (multithreaded only). */
    readonly workerModule?: string;
    init(options?: O): S;
    /**
     * Aggregate worker batch state into the main-thread state (multithreaded only).
     * Called on the main thread when worker snapshots are merged at pool drain.
     */
    merge(state: S, other: S): void;
    /**
     * Optional per-game hook after each game completes processing.
     * Runs on the worker in multithreaded mode and on the main thread when `workers: false`.
     * Still called when replay fails and `onError: 'skip-game'` skips the game (after `track` for that game).
     */
    onGameEnd?(state: S): void;
    /**
     * Optional end-of-analysis hook (e.g. sort aggregated keys).
     * Runs once on the main thread after all games are processed (`finishTrackers`).
     * Not invoked on worker threads — use `merge` to fold worker-local finalization if needed.
     */
    onFinish?(state: S): void;
}

/** Move-level tracker definition — receives {@link Action}[] per half-move. */
export interface MoveTrackerDef<S = unknown, O = unknown> extends TrackerDefBase<S, O> {
    readonly kind: 'move';
    track(state: S, actions: Action[]): void;
}

/** Game-level tracker definition — receives {@link ParsedGame} after each game. */
export interface GameTrackerDef<S = unknown, O = unknown> extends TrackerDefBase<S, O> {
    readonly kind: 'game';
    track(state: S, game: ParsedGame): void;
}

/** Any tracker definition (behavior + identity; no live state). */
export type TrackerDef<S = unknown, O = unknown> = MoveTrackerDef<S, O> | GameTrackerDef<S, O>;

/**
 * Stateful handle returned by a tracker factory (`tileTracker()`, custom `defineMoveTracker`, …).
 * Pass instances to {@link analyzePGN}; read accumulated results from {@link state}.
 */
export interface TrackerInstance<
    S = unknown,
    O = unknown,
    D extends TrackerDef<S, O> = TrackerDef<S, O>,
> {
    readonly def: D;
    /** Accumulated state — mutated in place during analysis. Must be a non-null object. */
    readonly state: S;
    /** Options passed to the factory (cloned to workers before `init`). */
    readonly options?: O;
}

/**
 * Callable that creates a {@link TrackerInstance}.
 * Carries a non-enumerable {@link def} so workers can resolve custom modules via `import.meta.url`.
 */
export interface TrackerFactory<
    S = unknown,
    O = unknown,
    D extends TrackerDef<S, O> = TrackerDef<S, O>,
> {
    (options?: O): TrackerInstance<S, O, D>;
    readonly def: D;
}
