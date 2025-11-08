import { Chessalyzer } from 'chessalyzer.js';

console.time('Time elapsed');
const header = await Chessalyzer.analyzePGN(
	'./manual-tests/lichess_db_standard_rated_2013-12.pgn'
);
console.log(
	`${header.cntGames} games (${header.cntMoves} moves) processed (${header.mps} moves/s)`
);
console.timeEnd('Time elapsed');
