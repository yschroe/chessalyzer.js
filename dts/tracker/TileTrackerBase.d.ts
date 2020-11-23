export default TileTrackerBase;
declare class TileTrackerBase extends BaseTracker {
    cntMovesGame: number;
    cntMovesTotal: number;
    tiles: any[];
    add(tracker: any): void;
    resetCurrentPiece(row: any, col: any): void;
    track(moveData: any): void;
    processMove(from: any, to: any, player: any, piece: any): void;
    processTakes(pos: any, player: any, takingPiece: any, takenPiece: any): void;
    addOccupation(pos: any): void;
}
import BaseTracker from "./BaseTracker";
