/* eslint-disable global-require */
/* eslint-disable import/no-dynamic-require */
/* eslint-disable no-undef */

import GameProcessor from './GameProcessor';
import PieceTracker from '../tracker/PieceTrackerBase';
import TileTracker from '../tracker/TileTrackerBase';
import GameTracker from '../tracker/GameTrackerBase';
import BaseTracker from '../tracker/BaseTracker';

const Tracker = {
	Game: GameTracker,
	Piece: PieceTracker,
	Tile: TileTracker,
	Base: BaseTracker
};
process.on('message', (msg) => {
	const TrackerList = {};
	const proc = new GameProcessor();

	Object.keys(Tracker).forEach((key) => {
		TrackerList[Tracker[key].name] = Tracker[key];
	});

	// merge available Trackers
	if (msg.customPath) {
		const TrackerListCustom = __non_webpack_require__(msg.customPath);

		Object.keys(TrackerListCustom).forEach((key) => {
			TrackerList[TrackerListCustom[key].name] = TrackerListCustom[key];
		});
	}

	// select needed analyzers
	const analyzer = [];
	msg.analyzerNames.forEach((name) => {
		analyzer.push(new TrackerList[name]());
	});

	for (let i = 0; i < analyzer.length; i += 1) {
		analyzer[i].cfg = msg.analyzerConfigs[i];
	}

	proc.attachAnalyzers(analyzer);

	// analyze each game
	msg.games.forEach((game) => {
		proc.processGame(game);
	});

	// send result of batch to master
	process.send({
		cntMoves: proc.cntMoves,
		gameAnalyzers: proc.gameAnalyzers,
		moveAnalyzers: proc.moveAnalyzers
	});
});
