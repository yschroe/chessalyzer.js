import { EventEmitter } from 'node:events';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { availableParallelism } from 'node:os';
import type {
	Game,
	AnalysisConfig,
	MultithreadConfig,
	GameAndMoveCount,
	WorkerMessage,
	GameProcessorAnalysisConfigFull,
	GameProcessorConfig
} from '../interfaces';
import GameParser from './game-parser';
import WorkerPool from './worker-pool';
import { readLinesFast } from './line-reader';

const HEADER_REGEX = /\[(.*?)\s"(.*?)"\]/;
const COMMENT_REGEX = /\{.*?\}|\(.*?\)/g;
const MOVE_REGEX = /[RNBQKOa-h][^\s?!#+]+/g;
const RESULT_REGEX = /-(1\/2|0|1)$/;

/**
 * Class that processes games.
 */
class GameProcessor {
	configs: GameProcessorAnalysisConfigFull[];
	readInHeader: boolean;
	multithreadConfig: MultithreadConfig | null;

	constructor(
		configs: AnalysisConfig[],
		multithreadCfg: MultithreadConfig | null
	) {
		this.readInHeader = false;
		this.configs = [];
		this.multithreadConfig = multithreadCfg;

		// convert AnalysisConfigs to GameProcessorAnalysisConfigFull
		for (const cfg of configs) {
			const tempCfg: GameProcessorAnalysisConfigFull = {
				trackers: { move: [], game: [] },
				trackerData: [],
				config: this.checkConfig(cfg.config ?? {}),
				processedMoves: 0,
				processedGames: 0,
				cntReadGames: 0,
				isDone: false
			};

			if (cfg.trackers) {
				for (const tracker of cfg.trackers) {
					if (tracker.type === 'move') {
						tempCfg.trackers.move.push(tracker);
					} else if (tracker.type === 'game') {
						tempCfg.trackers.game.push(tracker);

						// we need to read in the header if at least one game tracker is attached
						this.readInHeader = true;
					}

					tempCfg.trackerData.push({
						name: tracker.constructor.name,
						cfg: tracker.cfg,
						path: tracker.path
					});
				}
			}

			this.configs.push(tempCfg);
		}
	}

	/**
	 * Main function for parsing and analyzing.
	 * @param path Path to the PGN file.
	 * @returns Count of processed games and moves.
	 */
	async processPGN(path: string): Promise<GameAndMoveCount[]> {
		const isMultithreaded = this.multithreadConfig !== null;

		let workerPool: WorkerPool;
		if (isMultithreaded) {
			const __dirname = dirname(fileURLToPath(import.meta.url));
			workerPool = new WorkerPool(
				availableParallelism(),
				`${__dirname}/chess-worker.js`
			);
		}

		// create gamestore for each config
		const gameStore: Game[][] = this.configs.map(() => [] as Game[]);

		let game: Game = { moves: [] };

		const gameParser = new GameParser();

		lineLoop: for await (const line of readLinesFast(path)) {
			if (line === '') continue;

			const isHeaderTag = line.startsWith('[');
			switch (isHeaderTag) {
				case true: {
					if (!this.readInHeader) continue;
					const [_, key, value] = HEADER_REGEX.exec(line);
					game[key] = value;
					break;
				}
				case false: {
					// extract move SANs
					const cleanedLine = line.replaceAll(COMMENT_REGEX, '');
					const matchedMoves = cleanedLine.match(MOVE_REGEX) ?? [];

					// Add moves to game
					game.moves.push(...matchedMoves);

					// only if the result marker is found, all moves have been read -> start analyzing
					if (RESULT_REGEX.test(cleanedLine)) {
						for (
							let idxCfg = 0;
							idxCfg < this.configs.length;
							idxCfg += 1
						) {
							const cfg = this.configs[idxCfg];
							if (
								!cfg.isDone &&
								(!cfg.config.hasFilter ||
									cfg.config.filter(game))
							) {
								cfg.cntReadGames += 1;
								if (isMultithreaded) {
									gameStore[idxCfg].push(game);

									// if enough games have been read in, start worker threads and let them analyze
									if (
										gameStore[idxCfg].length ===
										this.multithreadConfig.batchSize
									) {
										workerPool.runTask(
											{
												games: gameStore[idxCfg],
												trackerData:
													this.configs[idxCfg]
														.trackerData,
												idxConfig: idxCfg
											},
											(
												err: Error,
												result: WorkerMessage
											) =>
												this.addDataFromWorker(
													err,
													result
												)
										);

										gameStore[idxCfg] = [];
									}
								} else {
									gameParser.processGame(game, cfg);
								}
								if (cfg.cntReadGames === cfg.config.cntGames) {
									cfg.isDone = true;
									const allDone = this.configs.reduce(
										(a, c) => a && c.isDone,
										true
									);
									if (allDone) break lineLoop;
								}
							}
						}
						game = { moves: [] };
					}
					break;
				}
			}
		}

		if (isMultithreaded) {
			// if on end there are still unprocessed games, start a last worker batch
			for (const [idx, games] of gameStore.entries()) {
				if (games.length > 0) {
					const { batchSize } = this.multithreadConfig;
					const nEndForks = Math.ceil(games.length / batchSize);
					for (let i = 0; i < nEndForks; i += 1) {
						workerPool.runTask(
							{
								games: games.slice(
									i * batchSize,
									i * batchSize + batchSize
								),
								trackerData: this.configs[idx].trackerData,
								idxConfig: idx
							},
							(err: Error, result: WorkerMessage) =>
								this.addDataFromWorker(err, result)
						);
					}
				}
			}
			workerPool.flagNotifyWhenDone = true;
			await EventEmitter.once(workerPool, 'done');
			await workerPool.close();
		}

		// trigger finish events on trackers
		for (const { trackers } of this.configs) {
			for (const tracker of trackers.game) tracker.finish?.();
			for (const tracker of trackers.move) tracker.finish?.();
		}

		const returnVals: GameAndMoveCount[] = this.configs.map((cfg) => ({
			cntGames: cfg.processedGames,
			cntMoves: cfg.processedMoves
		}));

		return returnVals;
	}

	/**
	 * If configured for multithreading, this function adds the result from a worker
	 * thread to the main thread.
	 * @param err Error object, if an error occured.
	 * @param result The result of the PGN parsing from the worker thread.
	 */
	private addDataFromWorker(err: Error, result: WorkerMessage) {
		if (err) throw err;

		const { idxConfig, gameTrackers, moveTrackers, cntMoves, cntGames } =
			result;

		// add tracker data from this worker
		for (let i = 0; i < gameTrackers.length; i += 1) {
			this.configs[idxConfig].trackers.game[i].add(gameTrackers[i]);
		}
		for (let i = 0; i < moveTrackers.length; i += 1) {
			this.configs[idxConfig].trackers.move[i].add(moveTrackers[i]);
		}
		this.configs[idxConfig].processedMoves += cntMoves;
		this.configs[idxConfig].processedGames += cntGames;
	}

	private checkConfig(config: AnalysisConfig['config']): GameProcessorConfig {
		const hasFilter = !!config.filter;

		// If we need to filter the games, we need the header information
		if (hasFilter) this.readInHeader = true;

		const cfg: GameProcessorConfig = {
			hasFilter,
			filter: hasFilter ? config.filter : () => true,
			cntGames: config.cntGames ?? Infinity
		};
		return cfg;
	}
}

export default GameProcessor;
