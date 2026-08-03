import { isBoardIndex, type BoardCoord } from '#board/board-coords';
import type { ChessPiece } from '#types/game';
import type { PromotionToken } from '#types/tokens';

/**
 * Canonical starting-position piece names used across board replay, tile tracking,
 * and heatmap generation.
 *
 * Names encode **file** (last char a–h) not piece type — e.g. `Nb` is the knight on
 * the b-file at game start. Index `col` matches board column (0 = a-file).
 */

/** Starting pawn names by file: Pa … Ph. */
export const PAWN_TEMPLATE = ['Pa', 'Pb', 'Pc', 'Pd', 'Pe', 'Pf', 'Pg', 'Ph'] as const;

/** Starting back-rank piece names by file: Ra, Nb, Bc, Qd, Ke, Bf, Ng, Rh. */
export const PIECE_TEMPLATE = ['Ra', 'Nb', 'Bc', 'Qd', 'Ke', 'Bf', 'Ng', 'Rh'] as const;

/** Starting-position piece names (`Pa`…`Ph`, `Ra`…`Rh`). */
export type Piece = (typeof PAWN_TEMPLATE)[number] | (typeof PIECE_TEMPLATE)[number];

/**
 * Internal name assigned to a promoted pawn on the board replay path (`Q17`, `R25`, …).
 * Format: promotion letter (R/N/B/Q) + numeric tile index.
 */
export type PromotedPieceName = `${PromotionToken}${number}`;

/** Starting or promoted piece identity returned by board replay ({@link MoveAction.piece}, captures, …). */
export type BoardPieceName = Piece | PromotedPieceName;

const promotedPieceNameRe = /^[RNBQ]\d+$/;

/** True when `name` matches the promoted-pawn naming scheme from {@link ChessBoard.promotePiece}. */
export function isPromotedPieceName(name: string): name is PromotedPieceName {
    return promotedPieceNameRe.test(name);
}

/**
 * Return the standard starting piece on `coords`, or null for empty ranks.
 * Board coords: row 0 = rank 8, row 7 = rank 1.
 *
 * Used by heatmaps for “starting piece on this square” context; promoted pieces
 * are not represented here.
 */
export function getStartingPiece(coords: BoardCoord): ChessPiece | null {
    const [row, col] = coords;
    if (!isBoardIndex(row) || !isBoardIndex(col)) return null;

    switch (row) {
        case 0:
            return { color: 'b', name: PIECE_TEMPLATE[col] };
        case 1:
            return { color: 'b', name: PAWN_TEMPLATE[col] };
        case 6:
            return { color: 'w', name: PAWN_TEMPLATE[col] };
        case 7:
            return { color: 'w', name: PIECE_TEMPLATE[col] };
        default:
            return null;
    }
}
