import type { PlayerColor } from '#types/tokens';

interface BaseAction {
    type: 'move' | 'capture' | 'promote';
    san: string;
    player: PlayerColor;
}

export interface MoveAction extends BaseAction {
    type: 'move';
    piece: string | null;
    from: number[];
    to: number[];
}

export interface CaptureAction extends BaseAction {
    type: 'capture';
    takingPiece: string | null;
    takenPiece: string | null;
    on: number[];
}

export interface PromoteAction extends BaseAction {
    type: 'promote';
    to: string;
    on: number[];
}

export type Action = MoveAction | CaptureAction | PromoteAction;
