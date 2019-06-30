/*eslint-disable*/
const Chessalyzer = require('../lib/chessalyzer');
const { Tracker } = Chessalyzer;

const a = new Tracker.Game();
const b = new Tracker.Piece();
const c = new Tracker.Tile();

a.profilingActive = true;
b.profilingActive = true;
c.profilingActive = true;

Chessalyzer.startMultiCore(
	'C:/Users/yanni/Downloads/lichess_db_standard_rated_2013-01.pgn',
	[a, b, c],
	{
		cntGames: 240000
		//filter: (game) => game.WhiteElo > 1800
	}
).then(() => {
	console.log('Piece: ' + Math.round(b.time) / 1000);
	console.log('Tile: ' + Math.round(c.time) / 1000);
	console.log('Game: ' + Math.round(a.time) / 1000);

	console.log(a.wins);
});
