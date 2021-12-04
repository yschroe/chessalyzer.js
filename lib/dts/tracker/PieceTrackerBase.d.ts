import BaseTracker from './BaseTracker.js';
import { MoveData } from '../interfaces/Interface.js';
declare class PieceTrackerBase extends BaseTracker {
    b: object;
    w: object;
    constructor();
    add(tracker: PieceTrackerBase): void;
    track(moveData: MoveData): void;
    processTakes(player: string, takingPiece: string, takenPiece: string): void;
}
export default PieceTrackerBase;
