import {
	Chessalyzer
	// GameTracker,
	// PieceTracker,
	// TileTracker
} from '../lib/chessalyzer.js';
// import CustomGameTracker from './CustomGameTracker.js';

// INFO: /manualTests/lichess_db_standard_rated_2013-12.pgn seems to use
// a very explicit PGN syntax, meaning that if two pieces could move to a
// target square and for one piece the way is obstructed (or moving will result in check)
// the piece is explicitly mentioned anyways, eg. R1a2, instead of just Ra2.

// const a = new GameTracker();
// const b = new PieceTracker();
// const c = new TileTracker();
// const d = new CustomGameTracker();

// a.cfg.profilingActive = true;
// b.cfg.profilingActive = true;
// c.cfg.profilingActive = true;

let mps = 0;
const cntRepeats = 3;

console.time('Time elapsed');
for (let _ = 0; _ < cntRepeats; _ += 1) {
	const result = await Chessalyzer.analyzePGN(
		// './manualTests/lichess_db_standard_rated_2014-09.pgn',
		'./manualTests/lichess_db_standard_rated_2013-12.pgn'
		// { config: { filter: () => true } },
		// null
		// { config: { cntGames: 750000 }, trackers: [b] }
		// null
	);
	mps += result.mps;
}

console.log(`--------> ${Math.round(mps / cntRepeats)} moves/s`);
console.timeEnd('Time elapsed');
// console.log('Game: ' + Math.round(a.time) / 1000);
// console.log('Piece: ' + Math.round(b.time) / 1000);
// console.log('Tile: ' + Math.round(c.time) / 1000);
// console.log('Custom: ' + d.wins);
