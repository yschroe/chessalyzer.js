import PieceTracker from './PieceTrackerBase.js';
import TileTracker from './TileTrackerBase.js';
import GameTracker from './GameTrackerBase.js';
import BaseTracker from './BaseTracker.js';

const Tracker = {
	Game: GameTracker,
	Piece: PieceTracker,
	Tile: TileTracker,
	Base: BaseTracker
};

export default Tracker;
