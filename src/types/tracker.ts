import type { Action } from '#types/actions';
import type { SquareData } from '#types/game';
import type { ParsedGame } from '#types/parse-pgn';

/** Optional runtime flags attached to tracker instances. */
export interface TrackerConfig {
    profilingActive: boolean;
}

/**
 * Contract implemented by {@link BaseTracker} and custom user trackers.
 * Move trackers receive {@link Action}[]; game trackers receive {@link ParsedGame}.
 */
/** Built-in or custom heatmap preset definition attached to a tracker. */
export interface HeatmapPresetEntry {
    scope?: string;
    unit?: string;
    description?: string;
    calc: HeatmapAnalysisFunc;
}

export interface Tracker {
    type: 'move' | 'game';
    cfg: TrackerConfig;
    time: number;
    t0: number;
    heatmapPresets?: Record<string, HeatmapPresetEntry> | null;
    analyze: (arg: ParsedGame | Action[]) => void;
    generateHeatmap: (
        fun: string | HeatmapAnalysisFunc,
        square?: string | number[],
        optData?: unknown,
    ) => HeatmapData;
    generateComparisonHeatmap: (
        compData: Tracker,
        fun: string | HeatmapAnalysisFunc,
        square?: string | number[],
        optData?: unknown,
    ) => HeatmapData;
    track: (arg: ParsedGame | Action[]) => void;
    nextGame?: () => void;
    finish?: () => void;
    merge?: (arg: Tracker) => void;
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
