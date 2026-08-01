import type { Action } from '#types/actions';
import type { SquareData } from '#types/game';
import type { ParsedGame } from '#types/parse-pgn';

/** Shared lifecycle hooks for move and game trackers. */
export interface TrackerBase {
    readonly type: 'move' | 'game';
    /** Optional per-game hook after each game (success or skipped). */
    onGameEnd?: () => void;
    /** Optional end-of-analysis hook (e.g. sort aggregated keys). */
    onFinish?: () => void;
    /**
     * Aggregate worker batch stats into this instance.
     * Receives a plain object after structured clone — duck-type fields; do not use `instanceof`.
     * Framework-owned fields such as `time` are merged centrally after this hook returns.
     */
    merge?: (arg: unknown) => void;
}

/** Move-level tracker contract — receives {@link Action}[] per half-move. */
export interface MoveTrackerContract extends TrackerBase {
    readonly type: 'move';
    track: (actions: Action[]) => void;
}

/** Game-level tracker contract — receives {@link ParsedGame} after each game. */
export interface GameTrackerContract extends TrackerBase {
    readonly type: 'game';
    track: (game: ParsedGame) => void;
}

/**
 * Public tracker contracts for {@link AnalyzeOptions.trackers}.
 *
 * Prefer extending {@link MoveTracker} or {@link BaseGameTracker} rather than implementing
 * these interfaces directly — customs must subclass those bases at runtime.
 *
 * Multithreaded custom trackers must use a **zero-arg constructor**, set
 * `static trackerId` and `static workerModule`, and implement {@link merge}.
 */
export type Tracker = MoveTrackerContract | GameTrackerContract;

/** Optional runtime flags attached to tracker instances (on {@link BaseTracker} subclasses). */
export interface TrackerConfig {
    profilingActive: boolean;
}

/** Built-in or custom heatmap preset definition. */
export interface HeatmapPresetEntry {
    scope?: 'global' | 'specific';
    unit?: string;
    description?: string;
    calc: HeatmapAnalysisFunc;
}

/** 8×8 numeric grid plus value range for rendering. */
export interface HeatmapData {
    map: number[][];
    min: number;
    max: number;
}

/** Signature for built-in and custom heatmap preset functions. */
export interface HeatmapAnalysisFunc<T = unknown> {
    (data: T, loopSqrData: SquareData, sqrData: SquareData, optData?: unknown): number;
}
