/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import GameProcessor from './GameProcessor.js';
import Tracker from '../tracker/Tracker.js';
import type { Game, WorkerMessage } from '../interfaces/index.js';

process.on(
	'message',
	(msg: {
		games: Game[];
		analyzerData: { name: string; cfg: object; path?: string }[];
		idxConfig: number;
	}) => {
		void (async () => {
			const TrackerList = {};
			const proc = new GameProcessor();

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
			const analyzer = [];
			for (const a of msg.analyzerData) {
				const currentAnalyzer = new TrackerList[a.name]();
				currentAnalyzer.cfg = a.cfg;
				analyzer.push(currentAnalyzer);
			}

			const cfg = { trackers: analyzer };
			proc.attachConfigs([cfg]);

			// analyze each game
			try {
				for (const game of msg.games)
					proc.processGame(game, proc.configs[0]);
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
				cntMoves: proc.configs[0].processedMoves,
				gameAnalyzers: proc.configs[0].analyzers.game,
				moveAnalyzers: proc.configs[0].analyzers.move,
				idxConfig: msg.idxConfig
			} as WorkerMessage);
		})();
	}
);

// only needed for workaround for https://github.com/nodejs/node/issues/39854
process.send({ type: 'readyForData' } as WorkerMessage);
