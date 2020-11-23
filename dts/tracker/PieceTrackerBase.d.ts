export default PieceTrackerBase;
declare class PieceTrackerBase extends BaseTracker {
    b: {};
    w: {};
    add(tracker: any): void;
    track(moveData: any): void;
    processTakes(player: any, takingPiece: any, takenPiece: any): void;
}
import BaseTracker from "./BaseTracker";
