import PieceTracker from './PieceTrackerBase';
import TileTracker from './TileTrackerBase';
import GameTracker from './GameTrackerBase';
import BaseTracker from './BaseTracker';

const Tracker = {
	Game: GameTracker,
	Piece: PieceTracker,
	Tile: TileTracker,
	Base: BaseTracker
};

export default Tracker;
