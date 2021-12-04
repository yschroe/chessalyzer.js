import PieceTracker from './PieceTrackerBase.js';
import TileTracker from './TileTrackerBase.js';
import GameTracker from './GameTrackerBase.js';
import BaseTracker from './BaseTracker.js';

export default {
	Game: GameTracker,
	Piece: PieceTracker,
	Tile: TileTracker,
	Base: BaseTracker
};
