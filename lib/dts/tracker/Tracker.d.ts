import PieceTracker from './PieceTrackerBase.js';
import TileTracker from './TileTrackerBase.js';
import GameTracker from './GameTrackerBase.js';
import BaseTracker from './BaseTracker.js';
declare const Tracker: {
    Game: typeof GameTracker;
    Piece: typeof PieceTracker;
    Tile: typeof TileTracker;
    Base: typeof BaseTracker;
};
export default Tracker;
