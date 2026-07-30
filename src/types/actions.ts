import type { Square } from '#board/board-coords';
import type { PlayerColor } from '#types/tokens';

/** Shared fields on replay {@link Action} variants. */
export interface BaseAction {
    type: 'move' | 'capture' | 'promote';
    san: string;
    player: PlayerColor;
}

export interface MoveAction extends BaseAction {
    type: 'move';
    piece: string | null;
    from: Square;
    to: Square;
    /** Present on the king leg when the SAN is a castle. */
    castle?: 'kingside' | 'queenside';
}

export interface CaptureAction extends BaseAction {
    type: 'capture';
    takingPiece: string | null;
    takenPiece: string | null;
    on: Square;
    /** True when the capture is en passant (pawn capture to an empty square). */
    enPassant?: true;
}

export interface PromoteAction extends BaseAction {
    type: 'promote';
    to: string;
    on: Square;
}

export type Action = MoveAction | CaptureAction | PromoteAction;
