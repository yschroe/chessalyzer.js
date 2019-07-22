/*eslint-disable*/
const Chessalyzer = require('../lib/chessalyzer');
const { Tracker } = Chessalyzer;

let a = new Tracker.Game();
let b = new Tracker.Piece();
let c = new Tracker.Tile();

const CustomTracker = require('./CustomTracker');

const d = new CustomTracker.CustomGame();

// a.profilingActive = true;
// b.profilingActive = true;
// c.profilingActive = true;

(async () => {
	await Chessalyzer.startBatchMultiCore(
		// './test/lichess_db_standard_rated_2013-12.pgn',
		'./test/YanSch_Gimker.pgn',
		[a, b, c],
		{
			cntGames: 250000,
			filter: game =>
				game.Variant === 'Standard' && game.Black === 'YanSch'
		},
		undefined,
		undefined
	);
	console.log('Piece: ' + Math.round(b.time) / 1000);
	console.log('Tile: ' + Math.round(c.time) / 1000);
	console.log('Game: ' + Math.round(a.time) / 1000);

	console.log(a.wins);

	Chessalyzer.saveData('./a.json', a);
	Chessalyzer.saveData('./b.json', b);
	Chessalyzer.saveData('./c.json', c);

	// await Chessalyzer.startBatch(
	// 	'./test/lichess_db_standard_rated_2013-12.pgn',
	// 	[a, d],
	// 	{
	// 		cntGames: 100000
	// 		//filter: (game) => game.WhiteElo > 1800
	// 	}
	// );
	// console.log('Piece: ' + Math.round(b.time) / 1000);
	// console.log('Tile: ' + Math.round(c.time) / 1000);
	// console.log('Game: ' + Math.round(a.time) / 1000);

	// console.log(a.wins);
	// console.log(d.wins);
})();
