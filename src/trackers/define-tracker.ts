import type { Action } from '#types/actions';
import type { ParsedGame } from '#types/parse-pgn';
import type { GameTrackerDef, MoveTrackerDef, TrackerDef, TrackerDefBase } from '#types/tracker';

type DefInput<S, O, K extends 'move' | 'game'> = Omit<TrackerDefBase<S, O>, 'kind'> & {
    kind?: K;
} & (K extends 'move'
        ? { track(state: S, actions: Action[]): void }
        : { track(state: S, game: ParsedGame): void });

/** Create a move-level tracker definition (core authoring primitive). */
export function defineMoveTracker<S, O = unknown>(
    def: DefInput<S, O, 'move'>,
): MoveTrackerDef<S, O> {
    return { kind: 'move', ...def };
}

/** Create a game-level tracker definition (core authoring primitive). */
export function defineGameTracker<S, O = unknown>(
    def: DefInput<S, O, 'game'>,
): GameTrackerDef<S, O> {
    return { kind: 'game', ...def };
}

function assertTrackerDefShape(tracker: TrackerDef): void {
    const id = tracker.id || '(unknown)';
    if (!tracker.id) {
        throw new Error('Tracker definition must have a non-empty id');
    }
    if (tracker.kind !== 'move' && tracker.kind !== 'game') {
        throw new Error(`Tracker "${id}" must set kind to "move" or "game"`);
    }
    if (typeof tracker.init !== 'function') {
        throw new Error(`Tracker "${id}" must implement init()`);
    }
    if (typeof tracker.track !== 'function') {
        throw new Error(`Tracker "${id}" must implement track()`);
    }
}

/** Runtime validation for tracker definitions passed to analyzePGN. */
export function assertTrackerDef(tracker: unknown): asserts tracker is TrackerDef {
    if (typeof tracker !== 'object' || tracker === null) {
        throw new Error('Trackers must be tracker definition objects or class instances');
    }
    assertTrackerDefShape(tracker as TrackerDef);
}

/** Validate multithreaded requirements on a tracker definition. */
export function assertMultithreadTrackerDef(
    tracker: TrackerDef,
    builtinIds: ReadonlySet<string>,
): void {
    assertTrackerDefShape(tracker);
    if (typeof tracker.merge !== 'function') {
        throw new Error(
            `Tracker "${tracker.id}" must implement merge() for multithreaded analysis`,
        );
    }
    if (!builtinIds.has(tracker.id) && !tracker.workerModule) {
        throw new Error(
            `Custom tracker "${tracker.id}" must set workerModule for multithreaded analysis`,
        );
    }
}

/** Abstract base for move-level tracker class adapters. */
export abstract class MoveTracker<S = unknown, O = unknown> implements MoveTrackerDef<S, O> {
    abstract readonly id: string;
    readonly kind = 'move' as const;
    readonly workerModule?: string;
    readonly options?: O;

    abstract init(options: O): S;
    abstract track(state: S, actions: Action[]): void;
    abstract merge(state: S, other: S): void;

    onGameEnd?(state: S): void;
    finish?(state: S): void;
}

/** Abstract base for game-level tracker class adapters. */
export abstract class BaseGameTracker<S = unknown, O = unknown> implements GameTrackerDef<S, O> {
    abstract readonly id: string;
    readonly kind = 'game' as const;
    readonly workerModule?: string;
    readonly options?: O;

    abstract init(options: O): S;
    abstract track(state: S, game: ParsedGame): void;
    abstract merge(state: S, other: S): void;

    onGameEnd?(state: S): void;
    finish?(state: S): void;
}
