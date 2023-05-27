import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { EventEmitter } from 'node:events';
import cluster from 'node:cluster';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
	Game,
	Move,
	Tracker,
	AnalysisConfig,
	MultithreadConfig,
	GameAndMoveCount,
	WorkerMessage,
	Action,
	MoveAction
} from '../interfaces/index.js';
import ChessBoard from './ChessBoard.js';
import Utils from './Utils.js';
import type {
	FileLetter,
	PieceToken,
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
	constructor(
		token: string,
		player: PlayerColor,
		tarRow: number,
		tarCol: number
	) {
		super(
			`${player}: No piece for move ${token} to (${tarRow},${tarCol}) found!`
		);
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
		multiThreadCfg: MultithreadConfig | null
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
				const currentMoveActions = this.parseMove(move);

				// move based analyzers
				for (const analyzer of analysisCfg.analyzers.move) {
					analyzer.analyze(currentMoveActions);
				}

				this.board.applyActions(currentMoveActions);
				this.activePlayer = this.activePlayer === 'w' ? 'b' : 'w';
			}
		} catch (err) {
			console.log(err, game);
			this.board.printPosition();
			// throw new Error();
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

	parseMove(rawMove: string): Action[] {
		const token = rawMove.substring(0, 1) as Token;
		const san = GameProcessor.preprocess(rawMove);

		if (token.toLowerCase() === token) {
			return this.pawnMove(san);
		} else if (token === 'O') {
			return this.castle(san);
		}

		return this.pieceMove(san);
	}

	pawnMove(san: string): Action[] {
		const actions: Action[] = [];

		const player = this.activePlayer;

		const direction = player === 'w' ? 1 : -1;
		let offset = 0;
		const coords: Move = { from: [], to: [] };

		// capture
		if (san.includes('x')) {
			const sanAdapted = san.replace('x', '');

			coords.to[0] = 8 - parseInt(sanAdapted.substring(2, 3), 10);
			coords.to[1] = Utils.getFileNumber(
				sanAdapted.substring(1, 2) as FileLetter
			);
			coords.from[0] = coords.to[0] + direction;
			coords.from[1] = Utils.getFileNumber(
				sanAdapted.substring(0, 1) as FileLetter
			);

			// en passant
			if (this.board.getPieceOnCoords(coords.to) === null) {
				offset = player === 'w' ? 1 : -1;
			}

			const takenOn = [coords.to[0] + offset, coords.to[1]];
			const takingPiece = this.board.getPieceOnCoords(coords.from)?.name;
			const takenPiece = this.board.getPieceOnCoords(takenOn)?.name;
			// if (!takingPiece || !takenPiece) throw new Error();

			actions.push({
				type: 'capture',
				san,
				player,
				on: takenOn,
				takingPiece,
				takenPiece
			});

			// moves
		} else {
			const tarRow = 8 - parseInt(san.substring(1, 2), 10);
			const tarCol = Utils.getFileNumber(
				san.substring(0, 1) as FileLetter
			);
			coords.from = [-1, tarCol]; // -1: to be found in for loop
			coords.to = [tarRow, tarCol];

			for (let i = 1; i <= 2; i += 1) {
				if (
					this.board
						.getPieceOnCoords([tarRow + i * direction, tarCol])
						?.name.startsWith('P')
				) {
					coords.from[0] = tarRow + i * direction;
					break;
				}
			}
		}

		const piece = this.board.getPieceOnCoords(coords.from)?.name;
		// if (!piece) throw new Error();

		// move action must always come after capture action
		actions.push({
			type: 'move',
			san,
			player,
			piece,
			from: coords.from,
			to: coords.to
		});

		// promotes
		if (san.includes('=')) {
			actions.push({
				type: 'promote',
				san,
				player,
				on: coords.to,
				to: san.slice(-1)
			});
		}

		return actions;
	}

	pieceMove(san: string): Action[] {
		const actions: Action[] = [];
		// const moveData = new ParsedMove();
		const player = this.activePlayer;

		let capture = false;
		let coords: Move = { from: [], to: [] };
		const token = san.substring(0, 1) as PieceToken;

		// create copy of san to be able to remove characters without altering the original san
		// remove token
		let tempSan = san.substring(1);

		// capture
		if (tempSan.includes('x')) {
			capture = true;
			tempSan = tempSan.replace('x', '');
		}

		// e.g. Re3f5
		if (tempSan.length === 4) {
			coords.from[0] = 8 - parseInt(tempSan.substring(1, 2), 10);
			coords.from[1] = Utils.getFileNumber(
				tempSan.substring(0, 1) as FileLetter
			);
			coords.to[0] = 8 - parseInt(tempSan.substring(3, 4), 10);
			coords.to[1] = Utils.getFileNumber(
				tempSan.substring(2, 3) as FileLetter
			);

			// e.g. Ref3
		} else if (tempSan.length === 3) {
			const tarRow = 8 - parseInt(tempSan.substring(2, 3), 10);
			const tarCol = Utils.getFileNumber(
				tempSan.substring(1, 2) as FileLetter
			);
			let mustBeInRow: number | null = null; // to be found
			let mustBeInCol: number | null = null; // to be found

			// file is specified
			const firstChar = tempSan.substring(0, 1);
			if (firstChar.match(/\D/)) {
				mustBeInCol = Utils.getFileNumber(firstChar as FileLetter);

				// rank is specified
			} else {
				mustBeInRow = 8 - Number(firstChar);
			}
			coords = this.findPiece(
				tarRow,
				tarCol,
				mustBeInRow,
				mustBeInCol,
				token,
				player
			);

			// e.g. Rf3
		} else {
			const tarRow = 8 - parseInt(tempSan.substring(1, 2), 10);
			const tarCol = Utils.getFileNumber(
				tempSan.substring(0, 1) as FileLetter
			);
			coords = this.findPiece(tarRow, tarCol, null, null, token, player);
		}

		const piece = this.board.getPieceOnCoords(coords.from)?.name;
		// if (!piece) throw new Error();

		if (capture) {
			const takenPiece = this.board.getPieceOnCoords(coords.to)?.name;
			// if (!takenPiece) throw new Error();
			actions.push({
				type: 'capture',
				san,
				player,
				on: coords.to,
				takingPiece: piece,
				takenPiece
			});
		}

		// move action must always come after capture action
		actions.push({
			type: 'move',
			san,
			player,
			piece,
			from: coords.from,
			to: coords.to
		});

		return actions;
	}

	castle(san: string): MoveAction[] {
		const actions: MoveAction[] = [];

		const player = this.activePlayer;
		const row = player === 'w' ? 7 : 0;

		switch (san) {
			case 'O-O': {
				actions.push({
					type: 'move',
					san,
					player,
					piece: 'Ke',
					from: [row, 4],
					to: [row, 6]
				});
				actions.push({
					type: 'move',
					san,
					player,
					piece: 'Rh',
					from: [row, 7],
					to: [row, 5]
				});
				break;
			}

			case 'O-O-O':
				actions.push({
					type: 'move',
					san,
					player,
					piece: 'Ke',
					from: [row, 4],
					to: [row, 2]
				});
				actions.push({
					type: 'move',
					san,
					player,
					piece: 'Ra',
					from: [row, 0],
					to: [row, 3]
				});
				break;
			default:
				console.log(
					'Castle action called without a castle SAN. This is probably a bug.'
				);
				break;
		}

		return actions;
	}

	/**
	 * Search the current position for a piece that could perform the move.
	 * @param tarRow Row number (0-7) of the square the piece should move to.
	 * @param tarCol Column number (0-7) of the square the piece should move to.
	 * @param mustBeInRow If value is passed, only pieces in that row are checked.
	 * @param mustBeInCol If value is passed, only pieces in that column are checked.
	 * @param token Type of piece that is looked for.
	 * @param player The moving player
	 * @returns The move which will fulfill all criteria.
	 */
	findPiece(
		tarRow: number,
		tarCol: number,
		mustBeInRow: number | null,
		mustBeInCol: number | null,
		token: PieceToken,
		player: PlayerColor
	): Move {
		const to = [tarRow, tarCol];

		// get array of positions of pieces of type <token>
		let validPieces = this.board.getPositionsForToken(player, token);

		// filter pieces that can reach target square
		if (validPieces.length > 1) {
			validPieces = validPieces.filter((val) => {
				const mustBeInFulfilled =
					(mustBeInRow === null || val[0] === mustBeInRow) &&
					(mustBeInCol === null || val[1] === mustBeInCol);
				return (
					mustBeInFulfilled &&
					((moveCfg[token as Exclude<PieceToken, 'K'>].line &&
						(val[0] === tarRow || val[1] === tarCol)) ||
						(moveCfg[token as Exclude<PieceToken, 'K'>].diag &&
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

		// else: one of the remaining pieces cannot move because of obstruction or it
		// would result in the king being in check. Find the allowed piece.
		for (const piece of validPieces) {
			let obstructed = false;

			if (token !== 'N') {
				const diff = [tarRow - piece[0], tarCol - piece[1]];
				const steps = Math.max(...diff.map((val) => Math.abs(val)));
				const dir = [Math.sign(diff[0]), Math.sign(diff[1])];
				for (let i = 1; i < steps && !obstructed; i += 1) {
					if (
						this.board.getPieceOnCoords([
							piece[0] + i * dir[0],
							piece[1] + i * dir[1]
						])
					) {
						obstructed = true;
					}
				}
			}

			if (!obstructed && !this.checkCheck({ from: piece, to }, player)) {
				return {
					from: piece,
					to
				};
			}
		}

		console.log(this.board.getPositionsForToken(player, token));
		throw new MoveNotFoundException(token, player, tarRow, tarCol);
	}

	/**
	 * Checks if performing the move would result in the king being in check.
	 *
	 * @param move The move to be checked.
	 * @param player The moving player.
	 * @returns King would be in check true/false
	 */
	checkCheck(move: Move, player: PlayerColor): boolean {
		const { from, to } = move;
		const opColor = player === 'w' ? 'b' : 'w';
		const king = this.board.getPiecePosition(player, 'Ke');

		// check if moving piece is on same line/diag as king, else exit
		const diff = [from[0] - king[0], from[1] - king[1]];
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
		const vertDir = Math.sign(diff[0]);
		const horzDir = Math.sign(diff[1]);

		// calculate distance from king to edge of board in direction of the moving piece
		let distanceHorizontal = 8;
		if (horzDir !== 0) {
			distanceHorizontal = horzDir === -1 ? king[1] : 8 - 1 - king[1];
		}
		let distanceVertical = 8;
		if (vertDir !== 0) {
			distanceVertical = vertDir === -1 ? king[0] : 8 - 1 - king[0];
		}
		const distanceToEdge = Math.min(distanceHorizontal, distanceVertical);
		if (distanceToEdge < 2) return false;

		const srcTilePiece = this.board.getPieceOnCoords(from);
		const tarTilePiece = this.board.getPieceOnCoords(to);

		// premove
		this.board.tiles[from[0]][from[1]] = null;
		this.board.tiles[to[0]][to[1]] = srcTilePiece;

		// check for check
		let isInCheck = false;
		for (let i = 1; i < distanceToEdge; i += 1) {
			const row = king[0] + i * vertDir;
			const col = king[1] + i * horzDir;

			const piece = this.board.getPieceOnCoords([row, col]);
			if (piece) {
				if (
					checkFor.some((token) => piece.name.startsWith(token)) &&
					piece.color === opColor
				) {
					isInCheck = true;
					break;
				} else {
					// way is obstructed by other piece
					break;
				}
			}
		}

		// revert premove
		this.board.tiles[from[0]][from[1]] = srcTilePiece;
		this.board.tiles[to[0]][to[1]] = tarTilePiece;

		return isInCheck;
	}

	static preprocess(move: string): string {
		return move.replace(/#|\+|\?|!/g, '');
	}
}

export default GameProcessor;
