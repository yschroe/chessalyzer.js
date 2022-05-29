import GameProcessor from './GameProcessor.js';
import Tracker from '../tracker/Tracker.js';
import type { Game } from '../interfaces/index.js';

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
			Object.keys(Tracker).forEach((key) => {
				TrackerList[Tracker[key].name] = Tracker[key];
			});

			// import custom trackers
			for (const a of msg.analyzerData.filter((val) => val.path)) {
				const customTracker = await import(a.path);
				TrackerList[a.name] = customTracker.default
					? customTracker.default
					: customTracker;
			}

			// select needed trackers
			const analyzer = [];
			msg.analyzerData.forEach((a) => {
				const currentAnalyzer = new TrackerList[a.name]();
				currentAnalyzer.cfg = a.cfg;
				analyzer.push(currentAnalyzer);
			});

			const cfg = { trackers: analyzer };
			proc.attachConfigs([cfg]);

			// analyze each game
			msg.games.forEach((game) => {
				proc.processGame(game, proc.configs[0]);
			});

			// send result of batch to master
			process.send({
				cntMoves: proc.configs[0].processedMoves,
				gameAnalyzers: proc.configs[0].analyzers.game,
				moveAnalyzers: proc.configs[0].analyzers.move,
				idxConfig: msg.idxConfig
			});
		})();
	}
);

// only needed for workaround for https://github.com/nodejs/node/issues/39854
process.send('readyForData');
