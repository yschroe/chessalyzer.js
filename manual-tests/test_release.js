import {
	Chessalyzer,
	GameTracker,
	PieceTracker,
	TileTracker
} from 'chessalyzer.js';
import CustomGameTracker from './CustomGameTracker.js';

const a = new GameTracker();
const b = new PieceTracker();
const c = new TileTracker();
const d = new CustomGameTracker();

// a.cfg.profilingActive = true;
// b.cfg.profilingActive = true;
c.cfg.profilingActive = true;

console.time('Time elapsed');
const header = await Chessalyzer.analyzePGN(
	'./manual-tests/lichess_db_standard_rated_2013-12.pgn'
);
console.log(
	`${header.cntGames} games (${header.cntMoves} moves) processed (${header.mps} moves/s)`
);
console.timeEnd('Time elapsed');
