import { Chessalyzer, Tracker } from '../src/index.js';

let a = new Tracker.Game();
let b = new Tracker.Piece();
let c = new Tracker.Tile();

// const CustomTracker = require('./CustomTracker');

// const d = new CustomTracker.CustomGame();

a.cfg.profilingActive = true;
b.cfg.profilingActive = true;
c.cfg.profilingActive = true;

(async () => {
	await Chessalyzer.startBatchMultiCore(
		'./test/lichess_db_standard_rated_2013-12.pgn',
		[], //[a, b, c, d],
		{
			cntGames: 50000
		},
		12500,
		1
		// undefined,
		// undefined
	);
	console.log('Game: ' + Math.round(a.time) / 1000);
	console.log('Piece: ' + Math.round(b.time) / 1000);
	console.log('Tile: ' + Math.round(c.time) / 1000);

	// console.log(a.ECO);
})();
