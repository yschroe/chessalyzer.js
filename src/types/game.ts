import type { BoardCoord } from '#board/board-coords';
import type { PlayerColor } from '#types/tokens';

/** Board square pair used in move actions. */
export interface Move {
    from: BoardCoord;
    to: BoardCoord;
}

/** Piece on a square (promoted pawns may have non-standard names). */
export interface ChessPiece {
    name: string;
    color: PlayerColor;
}

/** Context for one square when evaluating heatmap preset functions. */
export interface SquareData {
    alg: string;
    coords: BoardCoord;
    piece: { color: PlayerColor; name: string };
}
