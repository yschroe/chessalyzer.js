import { createReadStream } from 'node:fs';
import { Interface, createInterface } from 'node:readline';
import { EventEmitter } from 'node:events';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ChildProcess, fork } from 'node:child_process';
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

const __dirname = dirname(fileURLToPath(import.meta.url));

class ChessWorker {
	worker: ChildProcess;
	isReady: boolean;

	constructor(pathToFile: string) {
		this.worker = fork(pathToFile);

		// ready status must be false initially or we run into a race condition
		// where are newly created worker is not taken into account for work left
		this.isReady = false;
	}
}

/**
 * Class that processes games.
 */
class GameProcessor {
	configs: GameProcessorAnalysisConfigFull[];
	lineReader: Interface;
	readInHeader: boolean;
	readerFinished: boolean;
	status: EventEmitter;
	workers: ChessWorker[];
	errorInWorker: unknown;
	readInGamesCount: number[];

	constructor() {
		this.configs = [];
		this.readInHeader = false;
		this.readerFinished = false;

		this.workers = [];
		this.status = new EventEmitter();
	}

	async processPGN(
		path: string,
		configArray: AnalysisConfig[],
		multiThreadCfg: MultithreadConfig | null
	): Promise<GameAndMoveCount[]> {
		const isMultithreaded = multiThreadCfg !== null;

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
									void this.sendDataToWorker(
										gameStore[idxCfg],
										idxCfg
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
				// this.lineReader.removeAllListeners();
			}
		});

		// since the line reader reads in lines async, we need to wait here until
		// all lines have been read in
		await EventEmitter.once(this.lineReader, 'close');

		// if on end there are still unprocessed games, start a last worker batch
		if (!this.errorInWorker) {
			for (const [idx, games] of gameStore.entries()) {
				if (games.length > 0) {
					const nEndForks = Math.ceil(
						games.length / multiThreadCfg.batchSize
					);
					// console.log(
					// 	`${games.length} games left. Starting ${nEndForks} workers.`
					// );
					for (let i = 0; i < nEndForks; i += 1) {
						void this.sendDataToWorker(
							games.slice(
								i * multiThreadCfg.batchSize,
								i * multiThreadCfg.batchSize +
									multiThreadCfg.batchSize
							),
							idx
						);
					}
				}
			}
		}

		this.readerFinished = true;

		if (isMultithreaded) await EventEmitter.once(this.status, 'finished');
		// console.log(`${this.workers.length} Workers were spawned.`);
		for (const w of this.workers) w.worker.kill();

		if (this.errorInWorker) throw this.errorInWorker;

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
			this.readInGamesCount = configs.map((_val) => 0);
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

	private async sendDataToWorker(games: Game[], idxConfig: number) {
		// get first free worker
		let freeWorker = this.workers.find((w) => w.isReady);

		// if there is no free worker, spawn new one
		if (!freeWorker) {
			freeWorker = this.forkWorker();

			this.workers.push(freeWorker);

			// normally we could use w.send(...) outside of this function
			// there is a bug in node though, which sometimes sends the data too early
			// --> wait until the worker sends a custom ready message
			// see: https://github.com/nodejs/node/issues/39854
			await EventEmitter.once(freeWorker.worker, 'message');
		}

		// send data to worker for processing
		freeWorker.isReady = false;
		freeWorker.worker.send({
			games,
			analyzerData: this.configs[idxConfig].analyzerData,
			idxConfig
		});
	}

	// creates a new worker, that will process an array of games
	private forkWorker() {
		const w = new ChessWorker(`${__dirname}/Processor.worker.js`);

		// on worker finish
		w.worker.on('message', (msg: WorkerMessage) => {
			switch (msg.type) {
				case 'gamesProcessed': {
					const {
						idxConfig,
						gameAnalyzers,
						moveAnalyzers,
						cntMoves,
						cntGames
					} = msg;
					// add tracker data from this worker
					for (let i = 0; i < gameAnalyzers.length; i += 1) {
						this.configs[idxConfig].analyzers.game[i].add(
							gameAnalyzers[i]
						);
					}
					for (let i = 0; i < moveAnalyzers.length; i += 1) {
						this.configs[idxConfig].analyzers.move[i].add(
							moveAnalyzers[i]
						);
					}
					this.configs[idxConfig].processedMoves += cntMoves;
					this.configs[idxConfig].processedGames += cntGames;
					break;
				}
				// in case of error we stop reading in lines and save the error to throw it again later
				// we cannot immediately throw it when other worker threads are still running
				case 'error': {
					this.errorInWorker = msg.error;
					this.lineReader.close();
					break;
				}
			}

			if (msg.type === 'error' || msg.type === 'gamesProcessed') {
				w.isReady = true;

				// if this worker was the last one, emit 'finished' event
				if (
					this.workers.filter((w) => !w.isReady).length === 0 &&
					this.readerFinished
				) {
					this.status.emit('finished');
				}
			}
		});
		return w;
	}
}

export default GameProcessor;
