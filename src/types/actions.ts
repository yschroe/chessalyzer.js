import type { BoardCoord } from '#board/board-coords';
import type { PlayerColor } from '#types/tokens';

interface BaseAction {
    type: 'move' | 'capture' | 'promote';
    san: string;
    player: PlayerColor;
}

export interface MoveAction extends BaseAction {
    type: 'move';
    piece: string | null;
    from: BoardCoord;
    to: BoardCoord;
}

export interface CaptureAction extends BaseAction {
    type: 'capture';
    takingPiece: string | null;
    takenPiece: string | null;
    on: BoardCoord;
}

export interface PromoteAction extends BaseAction {
    type: 'promote';
    to: string;
    on: BoardCoord;
}

export type Action = MoveAction | CaptureAction | PromoteAction;
