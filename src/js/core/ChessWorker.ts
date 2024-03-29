/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { parentPort } from 'node:worker_threads';
import PieceTracker from '../tracker/PieceTrackerBase.js';
import TileTracker from '../tracker/TileTrackerBase.js';
import GameTracker from '../tracker/GameTrackerBase.js';
import BaseTracker from '../tracker/BaseTracker.js';
import type {
	GameProcessorAnalysisConfig,
	WorkerMessage,
	WorkerTaskData
} from '../interfaces/index.js';
import GameParser from './GameParser.js';

// init GameParser
const gameParser = new GameParser();

// prepare built-in trackers
const TrackerList = {};
TrackerList[PieceTracker.name] = PieceTracker;
TrackerList[TileTracker.name] = TileTracker;
TrackerList[GameTracker.name] = GameTracker;

parentPort.on('message', (msg: WorkerTaskData) => {
	void (async () => {
		// import custom trackers
		for (const tracker of msg.trackerData.filter((val) => val.path)) {
			if (!(tracker.name in TrackerList)) {
				const customTracker = await import(tracker.path);
				TrackerList[tracker.name] = customTracker.default
					? customTracker.default
					: customTracker;
			}
		}

		// select needed trackers
		const cfg: GameProcessorAnalysisConfig = {
			trackers: { move: [], game: [] },
			processedMoves: 0,
			processedGames: 0
		};
		for (const tracker of msg.trackerData) {
			const currentTracker: BaseTracker = new TrackerList[tracker.name]();
			currentTracker.cfg = tracker.cfg;

			// we need to remove the heatmapPresets here or we will get an
			// DOMException [DataCloneError] when sending the data back to the main thread
			currentTracker.heatmapPresets = null;

			cfg.trackers[currentTracker.type].push(currentTracker);
		}

		// analyze each game
		for (const game of msg.games) gameParser.processGame(game, cfg);

		const result: WorkerMessage = {
			cntMoves: cfg.processedMoves,
			cntGames: cfg.processedGames,
			gameTrackers: cfg.trackers.game,
			moveTrackers: cfg.trackers.move,
			idxConfig: msg.idxConfig
		};

		// send result of batch to master
		parentPort.postMessage(result);
	})();
});

// handle errors
// since above code runs inside a promise, simply catching and rethrowing
// causes a ERR_UNHANDLED_REJECTION error
process.on('unhandledRejection', (e: any) => {
	throw e.message;
});
