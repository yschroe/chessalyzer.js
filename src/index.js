/* eslint-disable */
import Chessalyzer from './core/Chessalyzer';

import PieceTracker from './tracker/PieceTrackerBase';
import TileTracker from './tracker/TileTrackerBase';
import GameTracker from './tracker/GameTrackerBase';
import BaseTracker from './tracker/BaseTracker';

const Tracker = {
	Game: GameTracker,
	Piece: PieceTracker,
	Tile: TileTracker,
	Base: BaseTracker
};
export { Chessalyzer, Tracker };
