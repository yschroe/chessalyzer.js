import BaseTracker from './BaseTracker.js';
import { MoveData } from '../interfaces/Interface.js';
interface StatsField {
    b: TileStats;
    w: TileStats;
    currentPiece: Piece;
}
declare class TileStats {
    movedTo: number;
    wasOn: number;
    killedOn: number;
    wasKilledOn: number;
    constructor();
}
declare class Piece {
    piece: string;
    color: string;
    lastMovedOn: number;
    constructor(piece: string, color: string);
}
declare class TileTrackerBase extends BaseTracker {
    cntMovesGame: number;
    cntMovesTotal: number;
    tiles: StatsField[][];
    constructor();
    add(tracker: TileTrackerBase): void;
    resetCurrentPiece(row: number, col: number): void;
    track(moveData: MoveData): void;
    processMove(from: any, to: any, player: any, piece: any): void;
    processTakes(pos: number[], player: string, takingPiece: string, takenPiece: string): void;
    addOccupation(pos: number[]): void;
}
export default TileTrackerBase;
