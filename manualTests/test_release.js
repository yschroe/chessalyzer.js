import {
	Chessalyzer,
	GameTracker,
	PieceTracker,
	TileTracker
} from '../lib/chessalyzer.js';
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
	// './manualTests/lichess_db_standard_rated_2014-09.pgn',
	'./manualTests/lichess_db_standard_rated_2013-12.pgn'
	// { config: { filter: () => true } },
	// null
	// { config: { cntGames: 750000 }, trackers: [b] }
	// null
);
console.log(
	`${header.cntGames} games (${header.cntMoves} moves) processed (${header.mps} moves/s)`
);
console.timeEnd('Time elapsed');
// console.log('Game: ' + Math.round(a.time) / 1000);
// console.log('Piece: ' + Math.round(b.time) / 1000);
// console.log('Tile: ' + Math.round(c.time) / 1000);
// console.log('Custom: ' + d.wins);
