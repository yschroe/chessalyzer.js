import { Chessalyzer } from '../lib/chessalyzer.js';

const header = await Chessalyzer.analyzePGN(
	'./manualTests/lichess_db_standard_rated_2013-12.pgn',
	{ config: { cntGames: 1000000 } },
	null
);
console.log(header);
console.log(
	`${header.cntGames} games (${header.cntMoves} moves) processed (${header.mps} moves/s)`
);
