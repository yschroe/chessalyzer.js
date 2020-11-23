export default Tracker;
declare namespace Tracker {
    export { GameTracker as Game };
    export { PieceTracker as Piece };
    export { TileTracker as Tile };
    export { BaseTracker as Base };
}
import GameTracker from "./GameTrackerBase";
import PieceTracker from "./PieceTrackerBase";
import TileTracker from "./TileTrackerBase";
import BaseTracker from "./BaseTracker";
