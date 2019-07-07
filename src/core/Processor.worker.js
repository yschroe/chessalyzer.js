/* eslint-disable global-require */
/* eslint-disable import/no-dynamic-require */
import GameProcessor from './GameProcessor';
import Chessalyzer from './Chessalyzer';

const { Tracker } = Chessalyzer;

const a = new Tracker.Game();
const b = new Tracker.Piece();
const c = new Tracker.Tile();

process.on('message', msg => {
	const proc = new GameProcessor();

	proc.attachAnalyzers([a, b, c]);

	// analyze each game
	msg.games.forEach(game => {
		proc.processGame(game);
	});

	// send result of batch to master
	process.send({
		cntMoves: proc.cntMoves,
		gameAnalyzers: proc.gameAnalyzers,
		moveAnalyzers: proc.moveAnalyzers
	});
});
