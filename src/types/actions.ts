import type { Square } from '#board/board-coords';
import type { PieceName } from '#board/piece-names';
import type { PlayerColor, PromotionToken } from '#types/tokens';

/** Shared fields on replay {@link Action} variants. */
interface BaseAction {
    type: 'move' | 'capture' | 'promote';
    san: string;
    player: PlayerColor;
}

export interface MoveAction extends BaseAction {
    type: 'move';
    /** Piece on the origin square after a successful SAN decode. */
    piece: PieceName;
    from: Square;
    to: Square;
    /** Present on the king leg when the SAN is a castle. */
    castle?: 'kingside' | 'queenside';
}

export interface CaptureAction extends BaseAction {
    type: 'capture';
    takingPiece: PieceName;
    takenPiece: PieceName;
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
