/*eslint-disable*/
const Chessalyzer = require('../lib/chessalyzer');
const { Tracker } = Chessalyzer;

// const c1 = new Chessalyzer();
const fun = (data, sqrData, loopSqrData) => {
	const { coords } = loopSqrData;
	let val = 0;
	val = data.tiles[coords[0]][coords[1]].b.Pa.movedTo;
	return val;
};

// const a = Chessalyzer.getGameTracker();
const a = new Tracker.Game();
const b = new Tracker.Piece();
const c = new Tracker.Tile();

for (let i = 0; i < 1; i += 1) {
	Chessalyzer.startBatch(
		'C:/Users/yanni/Downloads/lichess_db_standard_rated_2013-01.pgn',
		[a, b, c],
		{
			split: false,
			cntGames: 100000
			//filter: (game) => game.WhiteElo > 1800
		}
	).then(() => {
		//let stats = Chessalyzer.generateHeatmap(c, "a1", fun);
		//console.log(stats);
		// Chessalyzer.startBatch(
		// 	'C:/Users/yanni/Documents/Workspace/JavaScript/Archiv/Chessalyzer_p5js/lichess_db_standard_rated_2013-01.pgn',
		// 	a,
		// 	{
		// 		split: false,
		// 		cntGames: 1000
		// 		//filter: (game) => game.WhiteElo > 1800
		// 	}
		// ).then(() => {
		// 	console.log(a);
		// });
		// console.log(b);
		console.log('Piece: ' + Math.round(b.time) / 1000);
		console.log('Tile: ' + Math.round(c.time) / 1000);
		console.log('Game: ' + Math.round(a.time) / 1000);
		// let stats = Chessalyzer.generateHeatmap(c, 'a1', fun);
		// console.log(stats);
		// c1.saveData('C:/Users/yanni/Documents/Workspace/JavaScript/save.json');
		// console.log(c1.dataStore[0].tiles[0][0].defaultPiece.history);
		// c1.startBatch(
		// 	'C:/Users/yanni/Downloads/lichess_db_standard_rated_2017-04.pgn'
		// 'C:/Users/yanni/Documents/GitHub/archive/Chessalyzer_p5js/lichess_db_standard_rated_2013-01.pgn',
		// );
	});
}
