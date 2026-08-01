import { performance } from 'node:perf_hooks';

import type { Action } from '#types/actions';
import type { ParsedGame } from '#types/parse-pgn';
import type { GameTrackerContract, MoveTrackerContract, TrackerConfig } from '#types/tracker';

/** Apply worker bootstrap config to a tracker instance. Framework use only. */
export function applyTrackerConfig(tracker: BaseTracker, cfg: TrackerConfig): void {
    tracker.setRuntimeCfg(cfg);
}

/** @internal Framework use only — adds worker-reported profiling time after `merge`. */
export function addTrackerElapsed(tracker: { time: number }, ms: number): void {
    tracker.time += ms;
}

class BaseTracker {
    readonly type: 'move' | 'game';
    private t0: number;
    /** Accumulated profiling time in milliseconds (framework-owned; do not mutate in `merge`). */
    time: number;
    #cfg: TrackerConfig;

    /** Stable ID for worker-side tracker lookup (minification-safe). Required for multithreaded analysis. */
    static trackerId?: string;

    /** Module URL for worker-side dynamic import of custom trackers. Required for custom multithreaded trackers. */
    static workerModule?: string;

    constructor(type: 'move' | 'game') {
        this.type = type;
        this.#cfg = {
            profilingActive: false,
        };
        this.time = 0;
        this.t0 = 0;
    }

    get cfg(): Readonly<TrackerConfig> {
        return this.#cfg;
    }

    /** @internal Framework use only — prefer {@link applyTrackerConfig}. */
    setRuntimeCfg(cfg: TrackerConfig): void {
        this.#cfg = cfg;
    }

    /** @internal Framework use only — adds worker-reported profiling time after `merge`. */
    addElapsed(ms: number): void {
        addTrackerElapsed(this, ms);
    }

    protected profiledTrack(fn: () => void): void {
        if (this.#cfg.profilingActive) this.t0 = performance.now();
        fn();
        if (this.#cfg.profilingActive) this.time += performance.now() - this.t0;
    }

    /** Override when using multithreaded analysis to aggregate worker batch stats. */
    merge(_data: unknown) {}

    /** Optional per-game hook after each game (success or skip). */
    onGameEnd(): void {}

    /** Optional end-of-analysis hook (e.g. sort aggregated keys). */
    onFinish(): void {}
}

/** Abstract base for move-level trackers (receive {@link Action}[] per half-move). */
export abstract class MoveTracker extends BaseTracker implements MoveTrackerContract {
    override readonly type = 'move';

    constructor() {
        super('move');
    }

    analyze(actions: Action[]): void {
        this.profiledTrack(() => this.track(actions));
    }

    track(actions: Action[]): void {
        this.trackMoves(actions);
    }

    abstract trackMoves(actions: Action[]): void;
}

/**
 * Abstract base for game-level trackers (receive {@link ParsedGame} after each game).
 * Concrete built-in: {@link GameTracker}.
 */
export abstract class BaseGameTracker extends BaseTracker implements GameTrackerContract {
    override readonly type = 'game';

    constructor() {
        super('game');
    }

    analyze(game: ParsedGame): void {
        this.profiledTrack(() => this.track(game));
    }

    track(game: ParsedGame): void {
        this.trackGame(game);
    }

    abstract trackGame(game: ParsedGame): void;
}

export { BaseTracker };
