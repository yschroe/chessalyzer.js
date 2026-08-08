import type { Square } from '#board/board-coords';
import type { HeatmapPieceRef } from '#trackers/piece-types';

/** Numeric heatmap grid plus value range for rendering or normalization. */
export interface HeatmapData {
    /** 8×8 values; row 0 is rank 8, column 0 is the a-file (matches board indexing). */
    map: number[][];
    /** Minimum cell value across the grid. */
    min: number;
    /** Maximum cell value across the grid. */
    max: number;
}

/**
 * Signature for built-in and custom heatmap functions. Called once per square.
 *
 * @example
 * ```ts
 * const occupation: HeatmapFn<TileTrackerState> = ({ data, square }) => {
 *     const cell = data.squares[square];
 *     return cell ? cell.w.total.occupiedFor : 0;
 * };
 * ```
 */
export type HeatmapFn<T = unknown> = (args: {
    /** Tracker state being visualized. */
    data: T;
    /** Square being evaluated (`'a1'`…`'h8'`). */
    square: Square;
    /**
     * Piece that starts the game on `square`, or `null` when that square starts empty.
     * Lets a heatmap map each cell to a piece identity rather than a board location.
     */
    startingPiece: HeatmapPieceRef | null;
}) => number;
