import { Chessalyzer } from '../lib/chessalyzer.js';

const header = await Chessalyzer.analyzePGN(
	// './test/asorted_games.pgn',
	'./manualTests/lichess_db_standard_rated_2013-12.pgn',
	undefined,
	// { config: { cntGames: 5 } },
	null
);
console.log(header);
console.log(
	`${header.cntGames} games (${header.cntMoves} moves) processed (${header.mps} moves/s)`
);
