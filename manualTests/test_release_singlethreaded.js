import { Chessalyzer } from '../lib/chessalyzer.js';
import CustomGameTracker from './CustomGameTracker.js';

// const a = new Tracker.Game();
// const b = new Tracker.Piece();
// const c = new Tracker.Tile();
// const d = new CustomGameTracker();

// a.cfg.profilingActive = true;
// b.cfg.profilingActive = true;
// c.cfg.profilingActive = true;

const header = await Chessalyzer.analyzePGN(
	'./manualTests/lichess_db_standard_rated_2013-12.pgn',
	{ config: { cntGames: 50000 } },
	null
);
console.log(header);
console.log(
	`${header.cntGames} games (${header.cntMoves} moves) processed (${header.mps} moves/s)`
);
// console.log('Game: ' + Math.round(a.time) / 1000);
// console.log('Piece: ' + Math.round(b.time) / 1000);
// console.log('Tile: ' + Math.round(c.time) / 1000);
// console.log('Custom: ' + d.wins);
