import type { Action } from '#types/actions';
import type { SquareData } from '#types/game';
import type { ParsedGame } from '#types/parse-pgn';

/** Extract state type from a tracker definition. */
export type StateOf<D> = D extends TrackerDef<infer S> ? S : never;

/** Extract options type from a tracker definition. */
export type OptionsOf<D> = D extends TrackerDef<unknown, infer O> ? O : never;

/** Shared lifecycle hooks for move and game tracker definitions. */
export interface TrackerDefBase<S = unknown, O = unknown> {
    readonly id: string;
    readonly kind: 'move' | 'game';
    /** Module URL for worker-side dynamic import of custom trackers (multithreaded only). */
    readonly workerModule?: string;
    /** Plain options cloned to workers before `init`. */
    readonly options?: O;
    init(options?: O): S;
    /**
     * Aggregate worker batch state into the main-thread state.
     * Required for multithreaded analysis (validated at normalization).
     */
    merge?(state: S, other: S): void;
    /** Optional per-game hook after each game (success or skip). */
    onGameEnd?(state: S): void;
    /** Optional end-of-analysis hook (e.g. sort aggregated keys). */
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

/** Any tracker definition passed to {@link AnalyzeOptions.trackers}. */
export type TrackerDef<S = unknown, O = unknown> = MoveTrackerDef<S, O> | GameTrackerDef<S, O>;

/** Plain state snapshot sent worker → main at pool drain. */
export interface TrackerSnapshot {
    id: string;
    state: unknown;
}

/** One tracker definition plus its accumulated state in an {@link AnalyzeRunResult}. */
export interface AnalyzeTrackerResult<D extends TrackerDef = TrackerDef> {
    tracker: D;
    state: StateOf<D>;
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
