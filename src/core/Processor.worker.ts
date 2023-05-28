/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import Tracker from '../tracker/Tracker.js';
import type {
	Game,
	GameProcessorAnalysisConfig,
	TrackerConfig,
	WorkerMessage
} from '../interfaces/index.js';
import GameParser from './GameParser.js';
import BaseTracker from '../tracker/BaseTracker.js';

process.on(
	'message',
	(msg: {
		games: Game[];
		analyzerData: { name: string; cfg: TrackerConfig; path?: string }[];
		idxConfig: number;
	}) => {
		void (async () => {
			const TrackerList = {};
			const gameParser = new GameParser();

			// prepare built-in trackers
			for (const key of Object.keys(Tracker))
				TrackerList[Tracker[key].name] = Tracker[key];

			// import custom trackers
			for (const a of msg.analyzerData.filter((val) => val.path)) {
				const customTracker = await import(a.path);
				TrackerList[a.name] = customTracker.default
					? customTracker.default
					: customTracker;
			}

			// select needed trackers
			const cfg: GameProcessorAnalysisConfig = {
				analyzers: { move: [], game: [] },
				processedMoves: 0
			};
			for (const a of msg.analyzerData) {
				const currentAnalyzer: BaseTracker = new TrackerList[a.name]();
				currentAnalyzer.cfg = a.cfg;
				cfg.analyzers[currentAnalyzer.type].push(currentAnalyzer);
			}

			// analyze each game
			try {
				for (const game of msg.games) gameParser.processGame(game, cfg);
			} catch (err) {
				console.error(err);
				process.send({
					type: 'error',
					error: err
				} as WorkerMessage);
			}

			// send result of batch to master
			process.send({
				type: 'gamesProcessed',
				cntMoves: cfg.processedMoves,
				gameAnalyzers: cfg.analyzers.game,
				moveAnalyzers: cfg.analyzers.move,
				idxConfig: msg.idxConfig
			} as WorkerMessage);
		})();
	}
);

// only needed for workaround for https://github.com/nodejs/node/issues/39854
process.send({ type: 'readyForData' } as WorkerMessage);
