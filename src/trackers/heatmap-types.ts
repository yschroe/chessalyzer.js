import type { Square } from '#board/board-coords';
import type { PlayerColor } from '#types/tokens';

/** Context for one square when evaluating heatmap preset functions. */
export interface SquareData {
    square: Square;
    /** Starting piece on this square, or `null` when the square is empty in the initial position. */
    piece: { color: PlayerColor; name: string } | null;
}

/** 8×8 numeric grid plus value range for rendering. */
export interface HeatmapData {
    map: number[][];
    min: number;
    max: number;
}

/** Signature for built-in and custom heatmap preset functions. */
export type HeatmapAnalysisFunc<T = unknown> = (args: {
    /** Tracker state being visualized. */
    data: T;
    /** Square being evaluated in the current cell. */
    loopSquare: SquareData;
}) => number;
