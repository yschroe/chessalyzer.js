const Chessalyzer = require('../lib/chessalyzer');

const c1 = new Chessalyzer();

for (let i = 0; i < 1; i += 1) {
	c1.startBatch(
		'C:/Users/yanni/Documents/GitHub/archive/Chessalyzer_p5js/lichess_db_standard_rated_2013-01.pgn'
	).then(() => {
		// c1.startBatch(
		// 	'C:/Users/yanni/Documents/GitHub/archive/Chessalyzer_p5js/testgames2.pgn'
		// );
	});
}

//

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
