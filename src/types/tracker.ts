import type { Action } from '#types/actions';
import type { SquareData } from '#types/game';
import type { ParsedGame } from '#types/parse-pgn';

/**
 * Contract implemented by {@link BaseTracker} and custom user trackers.
 * Move trackers receive {@link Action}[]; game trackers receive {@link ParsedGame}.
 *
 * Prefer extending {@link MoveTracker} or {@link BaseGameTracker} rather than implementing
 * this interface directly — the raw `track` union is for framework dispatch.
 *
 * Multithreaded custom trackers must use a **zero-arg constructor**, set
 * `static trackerId` and `static workerModule`, and implement {@link merge}.
 */
export interface Tracker {
    type: 'move' | 'game';
    track: (arg: ParsedGame | Action[]) => void;
    onGameEnd?: () => void;
    finish?: () => void;
    /**
     * Aggregate worker batch stats into this instance.
     * Receives a plain object after structured clone — duck-type fields; do not use `instanceof`.
     * Framework-owned fields such as `time` are merged centrally after this hook returns.
     */
    merge?: (arg: unknown) => void;
}

/** Optional runtime flags attached to tracker instances (on {@link BaseTracker} subclasses). */
export interface TrackerConfig {
    profilingActive: boolean;
}

/** Built-in or custom heatmap preset definition attached to a tracker. */
export interface HeatmapPresetEntry {
    scope?: string;
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
