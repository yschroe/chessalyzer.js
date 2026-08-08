import type { Square } from '#board/board-coords';
import type { PieceName } from '#board/piece-names';
import type { PlayerColor, PromotionToken } from '#types/tokens';

/** From/to square pair shared by quiet moves and tracker helpers. */
export interface MoveCoords {
    from: Square;
    to: Square;
}

/** Shared fields on replay {@link Action} variants. */
interface BaseAction {
    type: 'move' | 'capture' | 'promote';
    san: string;
    player: PlayerColor;
}

/** A quiet move or castle king leg. */
export interface MoveAction extends BaseAction, MoveCoords {
    type: 'move';
    /** Standard Algebraic Notation of the half-move. */
    san: string;
    /** Side that played this half-move (`'w'` or `'b'`). */
    player: PlayerColor;
    /** Piece on the origin square after a successful SAN decode (starting or promoted name). */
    piece: PieceName;
    /** Present on the king leg when the SAN is a castle. */
    castle?: 'kingside' | 'queenside';
}

/** A capture (including en passant). */
export interface CaptureAction extends BaseAction {
    type: 'capture';
    /** Standard Algebraic Notation of the half-move. */
    san: string;
    /** Side that played this half-move (`'w'` or `'b'`). */
    player: PlayerColor;
    /** Capturing piece (starting or promoted name). */
    takingPiece: PieceName;
    /** Captured piece (starting or promoted name). */
    takenPiece: PieceName;
    /** Square where the capture occurred. */
    on: Square;
    /** Origin square of the capturing piece (en passant: differs from the paired move's `to`). */
    from?: Square;
    /** True when the capture is en passant (pawn capture to an empty square). */
    enPassant?: true;
}

/** A pawn promotion (may accompany a move or capture in the same half-move). */
export interface PromoteAction extends BaseAction {
    type: 'promote';
    /** Standard Algebraic Notation of the half-move. */
    san: string;
    /** Side that played this half-move (`'w'` or `'b'`). */
    player: PlayerColor;
    /** Promotion piece letter (`Q`, `R`, `B`, or `N`). */
    promotion: PromotionToken;
    /** Square where the pawn promoted. */
    on: Square;
}

/** One replayed half-move emitted in `'actions'` replay mode. */
export type Action = MoveAction | CaptureAction | PromoteAction;
