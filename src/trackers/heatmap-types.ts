import type { Square } from '#board/board-coords';
import type { StartingPieceName } from '#board/piece-names';
import type { PlayerColor } from '#types/tokens';

/** Context for one square when evaluating heatmap functions. */
export interface HeatmapSquare {
    /** Algebraic square (`'a1'`…`'h8'`). */
    square: Square;
    /** Starting piece on this square, or `null` when the square is empty in the initial position. */
    piece: { color: PlayerColor; name: StartingPieceName } | null;
}

/** Numeric heatmap grid plus value range for rendering or normalization. */
export interface HeatmapData {
    /** 8×8 values; row 0 is rank 8, column 0 is the a-file (matches board indexing). */
    map: number[][];
    /** Minimum cell value across the grid. */
    min: number;
    /** Maximum cell value across the grid. */
    max: number;
}

/** Signature for built-in and custom heatmap preset functions. */
export type HeatmapFn<T = unknown> = (args: {
    /** Tracker state being visualized. */
    data: T;
    /** Square being evaluated in the current cell. */
    square: HeatmapSquare;
}) => number;
