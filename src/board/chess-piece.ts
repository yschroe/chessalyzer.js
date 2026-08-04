import type { PieceName } from '#board/piece-names';
import type { PlayerColor } from '#types/tokens';

/** Piece on a square (promoted pawns may have non-standard names). */
export interface ChessPiece {
    name: PieceName;
    color: PlayerColor;
}
