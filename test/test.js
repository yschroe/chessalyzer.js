/*eslint-disable*/
const Chessalyzer = require('../lib/chessalyzer');

// const c1 = new Chessalyzer();
const fun = (data, sqrCoords, loopCoords) => {
	let val = 0;
	val = data.tiles[loopCoords[0]][loopCoords[1]].b.Pa.movedTo;
	return val;
};

const a = Chessalyzer.getGameTracker();
const b = Chessalyzer.getPieceTracker();
const c = Chessalyzer.getTileTracker();

for (let i = 0; i < 1; i += 1) {
	Chessalyzer.startBatch(
		'C:/Users/yanni/Documents/Workspace/JavaScript/Archiv/Chessalyzer_p5js/lichess_db_standard_rated_2013-01.pgn',
		{
			split: false,
			cntGames: 100000
			//filter: (game) => game.WhiteElo > 1800
		},
		[a, b, c]
	).then(() => {
		// console.log(a);
		// console.log(b);
		// console.log('Piece: ' + Math.round(c1.analyzers.move[0].time) / 1000);
		// console.log('Tile: ' + Math.round(c1.analyzers.move[1].time) / 1000);
		// console.log('Game: ' + Math.round(c1.analyzers.game[0].time) / 1000);
		let stats = Chessalyzer.generateHeatmap(c, 'a1', fun);
		console.log(stats);
		// c1.saveData('C:/Users/yanni/Documents/Workspace/JavaScript/save.json');
		// console.log(c1.dataStore[0].tiles[0][0].defaultPiece.history);
		// c1.startBatch(
		// 	'C:/Users/yanni/Downloads/lichess_db_standard_rated_2017-04.pgn'
		// 'C:/Users/yanni/Documents/GitHub/archive/Chessalyzer_p5js/lichess_db_standard_rated_2013-01.pgn',
		// );
	});
}

// b.printPosition();
// b.move({
// 	moves: [{ from: [1, 0], to: [2, 0] }],
// 	takes: false,
// 	promotes: null
// });
// b.printPosition();
// b.move({
// 	moves: [{ from: [2, 0], to: [3, 0] }],
// 	takes: false,
// 	promotes: null
// });
// b.printPosition();
