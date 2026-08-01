import type { BoardCoord, Square } from '#board/board-coords';
import type { Action } from '#types/actions';
import type { SquareData } from '#types/game';
import type { ParsedGame } from '#types/parse-pgn';

/** Extract state type from a tracker definition. */
export type StateOf<D> = D extends TrackerDef<infer S> ? S : never;

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

/** 8×8 numeric grid plus value range for rendering. */
export interface HeatmapData {
    map: number[][];
    min: number;
    max: number;
}

/** Arguments passed to built-in and custom heatmap analysis functions. */
export interface HeatmapAnalysisArgs<T = unknown> {
    /** Tracker state being visualized. */
    data: T;
    /** Square being evaluated in the current cell. */
    loopSquare: SquareData;
    /** Reference square (for relative presets). */
    refSquare: SquareData;
    /** Caller-provided extra context. */
    optData?: unknown;
}

/** Signature for built-in and custom heatmap preset functions. */
export type HeatmapAnalysisFunc<T = unknown> = (args: HeatmapAnalysisArgs<T>) => number;

/**
 * Options for `generateHeatmap` / `generateComparisonHeatmap`.
 * `P` is the preset-name union of the passed preset map, so `analysis` autocompletes.
 */
export interface GenerateHeatmapOptions<T = unknown, P extends string = string> {
    /** Preset name or custom analysis function. */
    analysis: P | HeatmapAnalysisFunc<T>;
    /** Reference square for presets that evaluate relative to a piece/square. */
    square?: Square | BoardCoord;
    /** Extra context forwarded to the analysis function. */
    optData?: unknown;
}
