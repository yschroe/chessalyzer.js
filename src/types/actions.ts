import type { Square } from '#board/board-coords';
import type { BoardPieceName } from '#board/piece-names';
import type { PlayerColor, PromotionToken } from '#types/tokens';

/** Shared fields on replay {@link Action} variants. */
export interface BaseAction {
    type: 'move' | 'capture' | 'promote';
    san: string;
    player: PlayerColor;
}

export interface MoveAction extends BaseAction {
    type: 'move';
    /**
     * Internal piece name from the starting layout (`'Pa'`, `'Nb'`, …) or a promoted pawn
     * name (`'Q17'`, …). `null` when the origin square has no piece (should not occur
     * on a successfully decoded move).
     */
    piece: BoardPieceName | null;
    from: Square;
    to: Square;
    /** Present on the king leg when the SAN is a castle. */
    castle?: 'kingside' | 'queenside';
}

export interface CaptureAction extends BaseAction {
    type: 'capture';
    takingPiece: BoardPieceName | null;
    takenPiece: BoardPieceName | null;
    on: Square;
    /** Origin square of the capturing piece (en passant: differs from the paired move's `to`). */
    from?: Square;
    /** True when the capture is en passant (pawn capture to an empty square). */
    enPassant?: true;
}

export interface PromoteAction extends BaseAction {
    type: 'promote';
    promotion: PromotionToken;
    on: Square;
}

export type Action = MoveAction | CaptureAction | PromoteAction;
