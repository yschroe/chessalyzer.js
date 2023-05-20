import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { EventEmitter } from 'node:events';
import cluster from 'node:cluster';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
	Game,
	Move,
	MoveData,
	Tracker,
	AnalysisConfig,
	MultithreadConfig,
	GameAndMoveCount,
	WorkerMessage
} from '../interfaces/index.js';
import ChessBoard from './ChessBoard.js';
import Utils from './Utils.js';
import type {
	PieceToken,
	PieceTokenWithoutKing,
	PlayerColor,
	Token
} from '../types/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const moveCfg = {
	Q: {
		line: true,
		diag: true
	},
	R: {
		line: true,
		diag: false
	},
	B: {
		line: false,
		diag: true
	},
	N: {
		line: false,
		diag: false
	}
};

class MoveNotFoundException extends Error {
	constructor(token: string, tarRow: number, tarCol: number) {
		super(`No piece for move ${token} to (${tarRow},${tarCol}) found!`);
		this.name = 'MoveNotFoundError';
	}
}

interface GameProcessorConfig {
	hasFilter: boolean;
	filter: (game: object) => boolean;
	cntGames: number;
}

interface GameProcessorAnalysisConfig {
	analyzers: { move: Tracker[]; game: Tracker[] };
	config: GameProcessorConfig;
	analyzerData: { name: string; cfg: unknown; path: string }[];
	cntGames: number;
	processedMoves: number;
	isDone: boolean;
}

class ParsedMove implements MoveData {
	san: string;
	player: PlayerColor;
	piece: string;
	castles: string;
	takes: { piece: string; pos: number[] };
	promotesTo: string;
	move: Move;

	constructor() {
		this.san = null;
		this.player = null;
		this.piece = null;
		this.castles = null;
		this.takes = null;
		this.promotesTo = null;
		this.move = null;
	}
}

/**
 * Class that processes games.
 */
class GameProcessor {
	board: ChessBoard;
	activePlayer: PlayerColor;
	configs: GameProcessorAnalysisConfig[];
	readInHeader: boolean;

	constructor() {
		this.board = new ChessBoard();
		this.activePlayer = 'w';
		this.configs = [];
		this.readInHeader = false;
	}

	attachConfigs(configs: AnalysisConfig[]): void {
		for (const cfg of configs) {
			const tempCfg = {
				analyzers: {
					move: [],
					game: []
				},
				analyzerData: [],
				config: this.checkConfig(cfg.config || {}),
				cntGames: 0,
				processedMoves: 0,
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
		}
	}

	checkConfig(config: AnalysisConfig['config']): GameProcessorConfig {
		const hasFilter = config.filter !== undefined;

		// if we need to filter the games, we need the header informations
		if (hasFilter) this.readInHeader = true;

		const cfg: GameProcessorConfig = {
			hasFilter,
			filter: hasFilter ? config.filter : () => true,
			cntGames: config.cntGames || Infinity
		};
		return cfg;
	}

	async processPGN(
		path: string,
		configArray: AnalysisConfig[],
		multiThreadCfg: MultithreadConfig
	): Promise<GameAndMoveCount[]> {
		try {
			let readerFinished = false;

			const isMultithreaded = multiThreadCfg !== null;
			const status = new EventEmitter();

			cluster.setupPrimary({
				exec: `${__dirname}/Processor.worker.js`
			});

			this.attachConfigs(configArray);

			const workers: {
				worker: typeof cluster.worker;
				isReady: boolean;
			}[] = [];

			const sendDataToWorker = async (
				games: Game[],
				idxConfig: number
			) => {
				let freeWorker = workers.find((w) => w.isReady);
				if (!freeWorker) {
					const freeIndex = workers.length;
					freeWorker = {
						worker: forkWorker(freeIndex),
						isReady: false
					};
					workers.push(freeWorker);
					await EventEmitter.once(freeWorker.worker, 'message');
				}

				freeWorker.isReady = false;
				freeWorker.worker.send({
					games,
					analyzerData: this.configs[idxConfig].analyzerData,
					idxConfig
				});
			};

			// creates a new worker, that will process an array of games
			const forkWorker = (idx: number) => {
				const w = cluster.fork();

				// on worker finish
				w.on('message', (msg: 'readyForData' | WorkerMessage) => {
					// normally we could use w.send(...) outside of this listener
					// there is a bug in node though, which sometimes sends the data too early
					// --> wait until the worker sends a custom ready message
					// see: https://github.com/nodejs/node/issues/39854
					if (msg !== 'readyForData') {
						const {
							idxConfig,
							gameAnalyzers,
							moveAnalyzers,
							cntMoves
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

						workers[idx].isReady = true;

						// if this worker was the last one, emit 'finished' event
						if (
							workers.filter((w) => !w.isReady).length === 0 &&
							readerFinished
						) {
							status.emit('finished');
						}
					}
				});
				return w;
			};

			const gameStore: Game[][] = [];
			configArray.forEach(() => {
				gameStore.push([]);
			});
			let game: Game = { moves: [] };

			// init line reader
			const lr = createInterface({
				input: createReadStream(path),
				crlfDelay: Infinity
			});

			// on new line
			lr.on('line', (line) => {
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
								(!cfg.config.hasFilter ||
									cfg.config.filter(game))
							) {
								cfg.cntGames += 1;
								if (isMultithreaded) {
									gameStore[idxCfg].push(game);

									// if enough games have been read in, start worker threads and let them analyze
									if (
										cfg.cntGames %
											multiThreadCfg.batchSize ===
										0
									) {
										void sendDataToWorker(
											gameStore[idxCfg],
											idxCfg
										);

										gameStore[idxCfg] = [];
									}
								} else {
									this.processGame(game, cfg);
								}
								if (cfg.cntGames >= cfg.config.cntGames)
									cfg.isDone = true;
							}
						}

						game = { moves: [] };
					}
				}
				const allDone = this.configs.reduce(
					(a, c) => a && c.isDone,
					true
				);

				if (allDone) {
					lr.close();
					lr.removeAllListeners();
				}
			});

			await EventEmitter.once(lr, 'close');

			// if on end there are still unprocessed games, start a last worker batch
			for (const [idx, games] of gameStore.entries()) {
				if (games.length > 0) {
					if (games.length > multiThreadCfg.batchSize) {
						const nEndForks = Math.ceil(
							games.length / multiThreadCfg.batchSize
						);
						for (let i = 0; i < nEndForks; i += 1) {
							void sendDataToWorker(
								games.slice(
									i * multiThreadCfg.batchSize,
									i * multiThreadCfg.batchSize +
										multiThreadCfg.batchSize
								),
								idx
							);
						}
					} else {
						void sendDataToWorker(games, idx);
					}
				}
			}

			readerFinished = true;
			if (isMultithreaded) await EventEmitter.once(status, 'finished');
			for (const w of workers) w.worker.kill();

			// trigger finish events on trackers
			for (const cfg of configArray) {
				if (cfg.trackers) {
					for (const tracker of cfg.trackers) {
						tracker.finish?.();
					}
				}
			}

			const returnVals: GameAndMoveCount[] = this.configs.map((cfg) => ({
				cntGames: cfg.cntGames,
				cntMoves: cfg.processedMoves
			}));

			return returnVals;
		} catch (err) {
			console.log(err);
			return [{ cntGames: -1, cntMoves: -1 }];
		}
	}

	processGame(game: Game, analysisCfg: GameProcessorAnalysisConfig): void {
		// game based analyzers
		for (const analyzer of analysisCfg.analyzers.game) {
			analyzer.analyze(game);
		}

		const { moves } = game;
		try {
			this.activePlayer = 'w';
			for (const move of moves) {
				// parse move from san to coordinates (and meta info)
				const currentMove = this.parseMove(move);

				// move based analyzers
				for (const analyzer of analysisCfg.analyzers.move) {
					analyzer.analyze(currentMove);
				}

				this.board.move(currentMove);
				this.activePlayer = this.activePlayer === 'w' ? 'b' : 'w';
			}
		} catch (err) {
			console.log(err, game);
			throw new Error();
		}

		// notify move analyzers that the current game is done
		for (const analyzer of analysisCfg.analyzers.move) {
			analyzer.nextGame?.();
		}

		analysisCfg.processedMoves += moves.length;
		this.board.reset();
	}

	reset(): void {
		this.board.reset();
		this.activePlayer = 'w';
	}

	parseMove(rawMove: string): ParsedMove {
		const token = rawMove.substring(0, 1) as Token;

		let currentMove: ParsedMove;
		const san = GameProcessor.preProcess(rawMove);

		if (token.toLowerCase() === token) {
			currentMove = this.pawnMove(san);
		} else if (token !== 'O') {
			currentMove = this.pieceMove(san);
		} else {
			currentMove = this.castle(san);
		}
		return currentMove;
	}

	pawnMove(san: string): ParsedMove {
		const moveData = new ParsedMove();
		moveData.san = san;
		moveData.player = this.activePlayer;

		const direction = this.activePlayer === 'w' ? 1 : -1;
		let offset = 0;
		const coords: Move = { from: [], to: [] };

		// takes
		if (moveData.san.includes('x')) {
			moveData.san = moveData.san.replace('x', '');

			coords.to[0] = 8 - parseInt(moveData.san.substring(2, 3), 10);
			coords.to[1] = Utils.getFileNumber(moveData.san.substring(1, 2));
			coords.from[0] = coords.to[0] + direction;
			coords.from[1] = Utils.getFileNumber(moveData.san.substring(0, 1));

			// en passant
			if (this.board.tiles[coords.to[0]][coords.to[1]] === null) {
				offset = moveData.player === 'w' ? 1 : -1;
			}

			moveData.takes = {
				piece: this.board.tiles[coords.to[0] + offset][coords.to[1]]
					.name,
				pos: [coords.to[0] + offset, coords.to[1]]
			};

			// moves
		} else {
			const tarRow = 8 - parseInt(moveData.san.substring(1, 2), 10);
			const tarCol = Utils.getFileNumber(moveData.san.substring(0, 1));

			coords.from[1] = tarCol;
			coords.to[0] = tarRow;
			coords.to[1] = tarCol;
			for (let i = tarRow + direction; i < 8 && i >= 0; i += direction) {
				if (this.board.tiles[i][tarCol] !== null) {
					if (this.board.tiles[i][tarCol].name.startsWith('P')) {
						coords.from[0] = i;
						break;
					}
				}
			}
		}

		moveData.piece = this.board.tiles[coords.from[0]][coords.from[1]].name;
		moveData.move = coords;

		// promotes
		if (moveData.san.includes('=')) {
			moveData.promotesTo = moveData.san.slice(-1);
		}

		return moveData;
	}

	pieceMove(san: string): ParsedMove {
		const moveData = new ParsedMove();
		moveData.san = san;
		moveData.player = this.activePlayer;

		let takes = false;
		let coords: Move = { from: [], to: [] };
		const token = moveData.san.substring(0, 1) as PieceToken;

		// create copy of san to be able to remove characters without altering the original san
		// remove token
		let tempSan = san.substring(1);

		// takes
		if (tempSan.includes('x')) {
			takes = true;
			tempSan = tempSan.replace('x', '');
		}

		// e.g. Re3f5
		if (tempSan.length === 4) {
			coords.from[0] = 8 - parseInt(tempSan.substring(1, 2), 10);
			coords.from[1] = Utils.getFileNumber(tempSan.substring(0, 1));
			coords.to[0] = 8 - parseInt(tempSan.substring(3, 4), 10);
			coords.to[1] = Utils.getFileNumber(tempSan.substring(2, 3));

			// e.g. Ref3
		} else if (tempSan.length === 3) {
			const tarRow = 8 - parseInt(tempSan.substring(2, 3), 10);
			const tarCol = Utils.getFileNumber(tempSan.substring(1, 2));
			let mustBeInRow: number = null;
			let mustBeInCol: number = null;

			// file is specified
			if (Utils.getFileNumber(tempSan.substring(0, 1)) >= 0) {
				mustBeInCol = Utils.getFileNumber(tempSan.substring(0, 1));

				// rank is specified
			} else {
				mustBeInRow = 8 - parseInt(tempSan.substring(0, 1), 10);
			}
			coords = this.findPiece(
				tarRow,
				tarCol,
				mustBeInRow,
				mustBeInCol,
				token,
				moveData.player
			);

			// e.g. Rf3
		} else {
			const tarRow = 8 - parseInt(tempSan.substring(1, 2), 10);
			const tarCol = Utils.getFileNumber(tempSan.substring(0, 1));
			coords = this.findPiece(
				tarRow,
				tarCol,
				null,
				null,
				token,
				moveData.player
			);
		}

		// set move data
		moveData.move = coords;
		moveData.piece = this.board.tiles[coords.from[0]][coords.from[1]].name;

		if (takes) {
			moveData.takes = {
				piece: this.board.tiles[moveData.move.to[0]][
					moveData.move.to[1]
				].name,
				pos: moveData.move.to
			};
		}

		return moveData;
	}

	castle(san: string): ParsedMove {
		const currentMove = new ParsedMove();
		currentMove.san = san;
		currentMove.player = this.activePlayer;
		currentMove.castles = currentMove.san;

		return currentMove;
	}

	findPiece(
		tarRow: number,
		tarCol: number,
		mustBeInRow: number,
		mustBeInCol: number,
		token: PieceToken,
		player: PlayerColor
	): Move {
		const to = [tarRow, tarCol];

		// get array of positions of pieces of type <token>
		let validPieces: number[][] = Object.values(
			this.board.pieces.posMap[player][token]
		);

		// filter pieces that can reach target square
		if (validPieces.length > 1) {
			validPieces = validPieces.filter((val) => {
				const mustBeInFulfilled =
					(mustBeInRow === null || val[0] === mustBeInRow) &&
					(mustBeInCol === null || val[1] === mustBeInCol);
				return (
					mustBeInFulfilled &&
					((moveCfg[token as PieceTokenWithoutKing].line &&
						(val[0] === tarRow || val[1] === tarCol)) ||
						(moveCfg[token as PieceTokenWithoutKing].diag &&
							Math.abs(val[0] - tarRow) ===
								Math.abs(val[1] - tarCol)) ||
						(token === 'N' &&
							((Math.abs(val[0] - tarRow) === 2 &&
								Math.abs(val[1] - tarCol) === 1) ||
								(Math.abs(val[0] - tarRow) === 1 &&
									Math.abs(val[1] - tarCol) === 2))))
				);
			});
		}

		// if only one piece is left, move is found
		if (validPieces.length === 1) {
			return {
				from: validPieces[0],
				to
			};
		}

		if (validPieces.length > 1) {
			for (const piece of validPieces) {
				let obstructed = false;

				if (token !== 'N') {
					const diff = [tarRow - piece[0], tarCol - piece[1]];
					const steps = Math.max(...diff.map((val) => Math.abs(val)));
					const dir = [Math.sign(diff[0]), Math.sign(diff[1])];
					for (let i = 1; i < steps && !obstructed; i += 1) {
						if (
							this.board.tiles[piece[0] + i * dir[0]][
								piece[1] + i * dir[1]
							]
						) {
							obstructed = true;
						}
					}
				}

				if (
					!obstructed &&
					!this.checkCheck({ from: piece, to }, player)
				) {
					return {
						from: piece,
						to
					};
				}
			}

			return {
				from: validPieces[validPieces.length - 1],
				to
			};
		}

		throw new MoveNotFoundException(token, tarRow, tarCol);
	}

	checkCheck(move: Move, player: PlayerColor): boolean {
		const { from } = move;
		const { to } = move;
		const color = player;
		const opColor = player === 'w' ? 'b' : 'w';
		const king = this.board.pieces.posMap[color].K.Ke;
		let isInCheck = false;

		// if king move, no check is possible, exit function
		if (king[0] === from[0] && king[1] === from[1]) return false;

		// check if moving piece is on same line/diag as king, else exit
		const diff: number[] = [];
		diff[0] = from[0] - king[0];
		diff[1] = from[1] - king[1];
		const checkFor: string[] = [];

		if (diff[0] === 0 || diff[1] === 0) {
			checkFor[0] = 'Q';
			checkFor[1] = 'R';
		} else if (Math.abs(diff[0]) === Math.abs(diff[1])) {
			checkFor[0] = 'Q';
			checkFor[1] = 'B';
		} else {
			return false;
		}
		if (diff[0] !== 0) diff[0] = Math.sign(diff[0]);
		if (diff[1] !== 0) diff[1] = Math.sign(diff[1]);

		const srcTilePiece = this.board.tiles[from[0]][from[1]];
		const tarTilePiece = this.board.tiles[to[0]][to[1]];

		// premove and check if check
		this.board.tiles[from[0]][from[1]] = null;
		this.board.tiles[to[0]][to[1]] = srcTilePiece;

		// check for check
		let obstructed = false;
		for (let j = 1; j < 8 && !isInCheck && !obstructed; j += 1) {
			const row = king[0] + j * diff[0];
			const col = king[1] + j * diff[1];

			if (
				row >= 0 &&
				row < 8 &&
				col >= 0 &&
				col < 8 &&
				this.board.tiles[row][col] !== null
			) {
				const piece = this.board.tiles[row][col];
				if (
					(piece.name.startsWith(checkFor[0]) ||
						piece.name.startsWith(checkFor[1])) &&
					piece.color === opColor
				) {
					isInCheck = true;
				} else {
					obstructed = true;
				}
			}
		}

		this.board.tiles[from[0]][from[1]] = srcTilePiece;
		this.board.tiles[to[0]][to[1]] = tarTilePiece;

		return isInCheck;
	}

	static preProcess(move: string): string {
		return move.replace(/#|\+|\?|!/g, '');
	}
}

export default GameProcessor;
