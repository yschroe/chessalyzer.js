import type { Square } from '#board/board-coords';
import type { PlayerColor } from '#types/tokens';

/** Board square pair used in tile move tracking. */
export interface MoveCoords {
    from: Square;
    to: Square;
}

/** Piece on a square (promoted pawns may have non-standard names). */
export interface ChessPiece {
    name: string;
    color: PlayerColor;
}

/** Context for one square when evaluating heatmap preset functions. */
export interface SquareData {
    square: Square;
    /** Starting piece on this square, or `null` when the square is empty in the initial position. */
    piece: { color: PlayerColor; name: string } | null;
}
