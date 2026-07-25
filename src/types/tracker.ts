import type { Action } from './actions';
import type { Game, SquareData } from './game';

/** Optional runtime flags attached to tracker instances. */
export interface TrackerConfig {
    profilingActive: boolean;
}

/**
 * Contract implemented by {@link BaseTracker} and custom user trackers.
 * Move trackers receive {@link Action}[]; game trackers receive {@link Game}.
 */
export interface Tracker {
    type: string;
    cfg: TrackerConfig;
    time: number;
    t0: number;
    path?: string;
    analyze: (arg: Game | Action[]) => void;
    generateHeatmap: (
        fun: string | HeatmapAnalysisFunc,
        square?: string | number[],
        optData?: unknown,
    ) => HeatmapData;
    generateComparisonHeatmap: (
        compData: this,
        fun: string | HeatmapAnalysisFunc,
        square?: string | number[],
        optData?: unknown,
    ) => HeatmapData;
    track: (arg: Game | Action[]) => void;
    nextGame?: () => void;
    finish?: () => void;
    add?: (arg: this) => void;
    /** Clear per-batch state when a worker reuses tracker instances. */
    resetWorkerBatch?: () => void;
}

/** 8×8 numeric grid plus value range for rendering. */
export interface HeatmapData {
    map: number[][];
    min: number;
    max: number;
}

/** Signature for built-in and custom heatmap preset functions. */
export interface HeatmapAnalysisFunc {
    (data: unknown, loopSqrData: SquareData, sqrData?: SquareData, optData?: unknown): number;
}
