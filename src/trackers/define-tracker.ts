import type { Action } from '#types/actions';
import type { ParsedGame } from '#types/parse-pgn';
import type {
    GameTrackerDef,
    MoveTrackerDef,
    TrackerDef,
    TrackerDefBase,
    TrackerFactory,
    TrackerInstance,
} from '#types/tracker';

type DefInput<S, O, K extends 'move' | 'game'> = Omit<TrackerDefBase<S, O>, 'kind'> & {
    kind?: K;
} & (K extends 'move'
        ? { track(state: S, actions: Action[]): void }
        : { track(state: S, game: ParsedGame): void });

function assertObjectState(id: string, state: unknown): asserts state is object {
    if (typeof state !== 'object' || state === null) {
        throw new Error(`Tracker "${id}" init() must return a non-null object`);
    }
}

function createFactory<S, O, D extends TrackerDef<S, O>>(def: D): TrackerFactory<S, O, D> {
    function factory(options?: O): TrackerInstance<S, O, D> {
        const state = def.init(options);
        assertObjectState(def.id, state);
        return { def, state, options };
    }

    Object.defineProperty(factory, 'def', {
        value: def,
        enumerable: false,
        writable: false,
        configurable: false,
    });

    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- defineProperty adds the non-enumerable def; callable shape matches TrackerFactory
    return factory as TrackerFactory<S, O, D>;
}

/** Create a move-level tracker factory (core authoring primitive). */
export function defineMoveTracker<S, O = unknown>(
    def: DefInput<S, O, 'move'>,
): TrackerFactory<S, O, MoveTrackerDef<S, O>> {
    const fullDef: MoveTrackerDef<S, O> = { kind: 'move', ...def };
    return createFactory(fullDef);
}

/** Create a game-level tracker factory (core authoring primitive). */
export function defineGameTracker<S, O = unknown>(
    def: DefInput<S, O, 'game'>,
): TrackerFactory<S, O, GameTrackerDef<S, O>> {
    const fullDef: GameTrackerDef<S, O> = { kind: 'game', ...def };
    return createFactory(fullDef);
}

function assertTrackerDefShape(tracker: object): asserts tracker is TrackerDef {
    const id = 'id' in tracker && typeof tracker.id === 'string' ? tracker.id : '(unknown)';
    if (!('id' in tracker) || typeof tracker.id !== 'string' || !tracker.id) {
        throw new Error('Tracker definition must have a non-empty id');
    }
    if (!('kind' in tracker) || (tracker.kind !== 'move' && tracker.kind !== 'game')) {
        throw new Error(`Tracker "${id}" must set kind to "move" or "game"`);
    }
    if (!('init' in tracker) || typeof tracker.init !== 'function') {
        throw new Error(`Tracker "${id}" must implement init()`);
    }
    if (!('track' in tracker) || typeof tracker.track !== 'function') {
        throw new Error(`Tracker "${id}" must implement track()`);
    }
}

/** Runtime validation for tracker definitions. */
export function assertTrackerDef(tracker: unknown): asserts tracker is TrackerDef {
    if (typeof tracker !== 'object' || tracker === null) {
        throw new Error('Tracker definition must be an object');
    }
    assertTrackerDefShape(tracker);
}

/** Runtime validation for tracker instances passed to analyzePGN. */
export function assertTrackerInstance(tracker: unknown): asserts tracker is TrackerInstance {
    if (typeof tracker !== 'object' || tracker === null) {
        throw new Error(
            'Trackers must be tracker instances from a factory call (e.g. tileTracker())',
        );
    }
    if (!('def' in tracker) || !('state' in tracker)) {
        throw new Error(
            'Trackers must be tracker instances from a factory call (e.g. tileTracker())',
        );
    }
    assertTrackerDef(tracker.def);
    if (typeof tracker.state !== 'object' || tracker.state === null) {
        throw new Error(`Tracker "${tracker.def.id}" state must be a non-null object`);
    }
}

/**
 * Multithreaded validation for tracker definitions. Callers must have already
 * validated the instance — this only checks the worker contract on {@link TrackerDef}.
 */
export function assertMultithreadTrackerDef(
    tracker: TrackerDef,
    builtinIds: ReadonlySet<string>,
): void {
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

/** Runtime check that a value is a tracker factory (callable with a `.def` property). */
export function assertTrackerFactory(value: unknown): asserts value is TrackerFactory {
    if (typeof value !== 'function') {
        throw new Error(
            'Custom tracker module must default-export a tracker factory (from defineGameTracker / defineMoveTracker), not a bare definition object',
        );
    }
    if (!('def' in value)) {
        throw new Error(
            'Custom tracker factory must carry a .def property (returned by defineGameTracker / defineMoveTracker)',
        );
    }
    assertTrackerDef(value.def);
}
