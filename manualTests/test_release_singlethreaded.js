import { Chessalyzer } from '../lib/chessalyzer.js';

const header = await Chessalyzer.analyzePGN(
	'./test/asorted_games.pgn',
	{ config: { cntGames: 5 } },
	null
);
console.log(header);
console.log(
	`${header.cntGames} games (${header.cntMoves} moves) processed (${header.mps} moves/s)`
);
