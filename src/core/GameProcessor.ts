import { createReadStream } from 'node:fs';
import { Interface, createInterface } from 'node:readline';
import { EventEmitter } from 'node:events';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import type {
	Game,
	AnalysisConfig,
	MultithreadConfig,
	GameAndMoveCount,
	WorkerMessage,
	GameProcessorAnalysisConfigFull,
	GameProcessorConfig
} from '../interfaces/index.js';
import GameParser from './GameParser.js';
import WorkerPool from './WorkerPool.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Class that processes games.
 */
class GameProcessor {
	configs: GameProcessorAnalysisConfigFull[];
	lineReader: Interface;
	readInHeader: boolean;
	readInGamesCount: number[];

	constructor() {
		this.configs = [];
		this.readInHeader = false;
	}

	async processPGN(
		path: string,
		configArray: AnalysisConfig[],
		multiThreadCfg: MultithreadConfig | null
	): Promise<GameAndMoveCount[]> {
		const isMultithreaded = multiThreadCfg !== null;
		let workerPool: WorkerPool;
		if (isMultithreaded)
			workerPool = new WorkerPool(
				os.availableParallelism(),
				`${__dirname}/ChessWorker.js`
			);

		this.attachConfigs(configArray);

		const gameStore: Game[][] = [];
		configArray.forEach(() => {
			gameStore.push([]);
		});
		let game: Game = { moves: [] };

		const gameParser = new GameParser();

		// init line reader
		this.lineReader = createInterface({
			input: createReadStream(path),
			crlfDelay: Infinity
		});

		// on new line
		this.lineReader.on('line', (line) => {
			// data tag
			if (this.readInHeader && line.startsWith('[')) {
				const key = line.match(/\[(.*?)\s/)[1];
				const value = line.match(/"(.*?)"/)[1];

				game[key] = value;

				// moves
			} else if (line.match(/^\d/)) {
				// add current move line
				game.moves = game.moves.concat(
					line
						.replace(/(\d+\.{1,3}\s)|(\s?\{(.*?)\})/g, '')
						.split(' ')
				);

				// only if the result marker is in the line, all moves have been read -> start analyzing
				if (line.match(/((1-0)|(0-1)|(1\/2-1\/2)|(\*))$/)) {
					// remove the result from the moves array
					game.moves.pop();

					for (
						let idxCfg = 0;
						idxCfg < this.configs.length;
						idxCfg += 1
					) {
						const cfg = this.configs[idxCfg];
						if (
							!cfg.isDone &&
							(!cfg.config.hasFilter || cfg.config.filter(game))
						) {
							cfg.cntReadGames += 1;
							if (isMultithreaded) {
								gameStore[idxCfg].push(game);

								// if enough games have been read in, start worker threads and let them analyze
								if (
									gameStore[idxCfg].length ===
									multiThreadCfg.batchSize
								) {
									workerPool.runTask(
										{
											games: gameStore[idxCfg],
											analyzerData:
												this.configs[idxCfg]
													.analyzerData,
											idxConfig: idxCfg
										},
										(err: Error, result: WorkerMessage) =>
											this.addDataFromWorker(err, result)
									);

									gameStore[idxCfg] = [];
								}
							} else {
								gameParser.processGame(game, cfg);
							}
							if (cfg.cntReadGames >= cfg.config.cntGames)
								cfg.isDone = true;
						}
					}

					game = { moves: [] };
				}
			}
			const allDone = this.configs.reduce((a, c) => a && c.isDone, true);

			if (allDone) {
				this.lineReader.close();
			}
		});

		// since the line reader reads in lines async, we need to wait here until
		// all lines have been read in
		await EventEmitter.once(this.lineReader, 'close');

		// if on end there are still unprocessed games, start a last worker batch
		for (const [idx, games] of gameStore.entries()) {
			if (games.length > 0) {
				const nEndForks = Math.ceil(
					games.length / multiThreadCfg.batchSize
				);
				for (let i = 0; i < nEndForks; i += 1) {
					workerPool.runTask(
						{
							games: games.slice(
								i * multiThreadCfg.batchSize,
								i * multiThreadCfg.batchSize +
									multiThreadCfg.batchSize
							),
							analyzerData: this.configs[idx].analyzerData,
							idxConfig: idx
						},
						(err: Error, result: WorkerMessage) =>
							this.addDataFromWorker(err, result)
					);
				}
			}
		}

		if (isMultithreaded) {
			workerPool.flagNotifyWhenDone = true;
			await EventEmitter.once(workerPool, 'done');
			await workerPool.close();
		}

		// trigger finish events on trackers
		for (const cfg of configArray) {
			if (cfg.trackers) {
				for (const tracker of cfg.trackers) {
					tracker.finish?.();
				}
			}
		}

		const returnVals: GameAndMoveCount[] = this.configs.map((cfg) => ({
			cntGames: cfg.processedGames,
			cntMoves: cfg.processedMoves
		}));

		return returnVals;
	}

	private addDataFromWorker(err: Error, result: WorkerMessage) {
		if (err) throw err;

		const { idxConfig, gameAnalyzers, moveAnalyzers, cntMoves, cntGames } =
			result;

		// add tracker data from this worker
		for (let i = 0; i < gameAnalyzers.length; i += 1) {
			this.configs[idxConfig].analyzers.game[i].add(gameAnalyzers[i]);
		}
		for (let i = 0; i < moveAnalyzers.length; i += 1) {
			this.configs[idxConfig].analyzers.move[i].add(moveAnalyzers[i]);
		}
		this.configs[idxConfig].processedMoves += cntMoves;
		this.configs[idxConfig].processedGames += cntGames;
	}

	private attachConfigs(configs: AnalysisConfig[]): void {
		for (const cfg of configs) {
			const tempCfg: GameProcessorAnalysisConfigFull = {
				analyzers: {
					move: [],
					game: []
				},
				analyzerData: [],
				config: this.checkConfig(cfg.config || {}),
				processedMoves: 0,
				processedGames: 0,
				cntReadGames: 0,
				isDone: false
			};

			if (cfg.trackers) {
				for (const tracker of cfg.trackers) {
					if (tracker.type === 'move') {
						tempCfg.analyzers.move.push(tracker);
					} else if (tracker.type === 'game') {
						tempCfg.analyzers.game.push(tracker);

						// we need to read in the header if at least one game tracker is attached
						this.readInHeader = true;
					}

					tempCfg.analyzerData.push({
						name: tracker.constructor.name,
						cfg: tracker.cfg,
						path: tracker.path
					});
				}
			}

			this.configs.push(tempCfg);
			this.readInGamesCount = configs.map(() => 0);
		}
	}

	private checkConfig(config: AnalysisConfig['config']): GameProcessorConfig {
		const hasFilter = !!config.filter;

		// if we need to filter the games, we need the header informations
		if (hasFilter) this.readInHeader = true;

		const cfg: GameProcessorConfig = {
			hasFilter,
			filter: hasFilter ? config.filter : () => true,
			cntGames: config.cntGames || Infinity
		};
		return cfg;
	}
}

export default GameProcessor;
