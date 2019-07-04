/*eslint-disable*/
const Chessalyzer = require('../lib/chessalyzer');
const { Tracker } = Chessalyzer;

const a = new Tracker.Game();
const b = new Tracker.Piece();
const c = new Tracker.Tile();

// a.profilingActive = true;
// b.profilingActive = true;
// c.profilingActive = true;
(async () => {
	await Chessalyzer.startBatchMultiCore(
		'C:/Users/yanni/Downloads/lichess_db_standard_rated_2013-12.pgn',
		[],
		{
			cntGames: 150000
			//filter: (game) => game.WhiteElo > 1800
		}
	);
	console.log('Piece: ' + Math.round(b.time) / 1000);
	console.log('Tile: ' + Math.round(c.time) / 1000);
	console.log('Game: ' + Math.round(a.time) / 1000);

	console.log(a.wins);
	// console.log(b);

	await Chessalyzer.startBatch(
		'C:/Users/yanni/Downloads/lichess_db_standard_rated_2013-12.pgn',
		[],
		{
			cntGames: 150000
			//filter: (game) => game.WhiteElo > 1800
		}
	);
	console.log('Piece: ' + Math.round(b.time) / 1000);
	console.log('Tile: ' + Math.round(c.time) / 1000);
	console.log('Game: ' + Math.round(a.time) / 1000);

	console.log(a.wins);
	// console.log(b);
})();
