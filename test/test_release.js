/*eslint-disable*/
const Chessalyzer = require('../lib/chessalyzer.min');
const { Tracker } = Chessalyzer;

const a = new Tracker.Game();
const b = new Tracker.Piece();
const c = new Tracker.Tile();

const CustomTracker = require('./CustomTracker');

const d = new CustomTracker.CustomGame();

a.profilingActive = true;
b.profilingActive = true;
c.profilingActive = true;

(async () => {
	await Chessalyzer.startBatchMultiCore(
		'./test/lichess_db_standard_rated_2013-12.pgn',
		[a, b, c],
		{
			cntGames: 100000
		},
		undefined,
		undefined
	);
	console.log(a)
	console.log('Game: ' + Math.round(a.time) / 1000);
	console.log('Piece: ' + Math.round(b.time) / 1000);
	console.log('Tile: ' + Math.round(c.time) / 1000);

	// console.log(a.ECO);
})();
