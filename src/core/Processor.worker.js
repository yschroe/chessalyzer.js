/* eslint-disable global-require */
/* eslint-disable import/no-dynamic-require */
/* eslint-disable no-undef */

import GameProcessor from './GameProcessor';
import Chessalyzer from './Chessalyzer';

const { Tracker } = Chessalyzer;
const TrackerList = {
	BaseGame: Tracker.Game,
	BasePiece: Tracker.Piece,
	BaseTile: Tracker.Tile
};

process.on('message', msg => {
	const proc = new GameProcessor();

	// merge available Trackers
	if (msg.customPath !== '') {
		const TrackerListCustom = __non_webpack_require__(msg.customPath);
		Object.keys(TrackerListCustom).forEach(key => {
			TrackerList[key] = TrackerListCustom[key];
		});
	}

	// select needed analyzers
	const analyzer = [];
	msg.analyzerNames.forEach(name => {
		analyzer.push(new TrackerList[name]());
	});

	proc.attachAnalyzers(analyzer);

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
