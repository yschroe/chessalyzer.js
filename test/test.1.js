/*eslint-disable*/
const Chessalyzer = require('../lib/chessalyzer');
const { Tracker } = Chessalyzer;

let a = new Tracker.Game();
let b = new Tracker.Piece();
let c = new Tracker.Tile();

const GameTracker = require('./CustomTracker');

const d = new GameTracker();
// a.profilingActive = true;
// b.profilingActive = true;
// c.profilingActive = true;

(async () => {
	await Chessalyzer.startBatchMultiCore(
		'./test/lichess_db_standard_rated_2013-12.pgn',
		[a, b, c],
		{
			cntGames: 10000
			//filter: (game) => game.WhiteElo > 1800
		}
	);
	console.log('Piece: ' + Math.round(b.time) / 1000);
	console.log('Tile: ' + Math.round(c.time) / 1000);
	console.log('Game: ' + Math.round(a.time) / 1000);

	console.log(a.wins);

	a = new Tracker.Game();
	b = new Tracker.Piece();
	c = new Tracker.Tile();

	await Chessalyzer.startBatch(
		'./test/lichess_db_standard_rated_2013-12.pgn',
		[a, b, c],
		{
			cntGames: 10000
			//filter: (game) => game.WhiteElo > 1800
		}
	);
	console.log('Piece: ' + Math.round(b.time) / 1000);
	console.log('Tile: ' + Math.round(c.time) / 1000);
	console.log('Game: ' + Math.round(a.time) / 1000);

	console.log(a.wins);
	console.log(d.wins);
})();
