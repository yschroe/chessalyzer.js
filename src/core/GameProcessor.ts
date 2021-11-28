import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import { EventEmitter } from 'events';
import cluster from 'cluster';
import ChessBoard from './ChessBoard.js';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import BaseTracker from '../tracker/BaseTracker.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const files = 'abcdefgh';

class MoveNotFoundException extends Error {
	constructor(token, tarRow, tarCol, gameProcessor) {
		super(`No piece for move ${token} to (${tarRow},${tarCol}) found!`);
		this.name = 'MoveNotFoundError';
		this['Game Number'] = gameProcessor.cntGames;
		gameProcessor.board.printPosition();
	}
}

interface GameProcessorConfig {
	hasFilter: boolean;
	filter: (game: object) => boolean;
	cntGames: number;
}

interface Game {
	moves: string[];
}

interface Coords {
	from: number[];
	to: number[];
}

class MoveData {
	san: string;
	player: string;
	piece: string;
	castles: string;
	takes: object;
	promotesTo: string;
	from: number[];
	to: number[];

	constructor() {
		this.san = '';
		this.player = '';
		this.piece = '';
		this.castles = '';
		this.takes = {};
		this.promotesTo = '';
		this.from = [-1, -1];
		this.to = [-1, -1];
	}
}

/**
 * Class that processes games.
 */
class GameProcessor extends EventEmitter {
	board: ChessBoard;
	activePlayer: number;
	cntMoves: number;
	cntGames: number;
	gameAnalyzers: BaseTracker[];
	moveAnalyzers: BaseTracker[];

	constructor() {
		super();
		this.board = new ChessBoard();
		this.activePlayer = 0;
		this.cntMoves = 0;
		this.cntGames = 0;
		this.gameAnalyzers = [];
		this.moveAnalyzers = [];
	}

	static checkConfig(config) {
		const cfg: GameProcessorConfig = {};
		cfg.hasFilter = Object.prototype.hasOwnProperty.call(config, 'filter');
		cfg.filter = cfg.hasFilter ? config.filter : () => true;

		cfg.cntGames = Object.prototype.hasOwnProperty.call(config, 'cntGames')
			? config.cntGames
			: Infinity;

		return cfg;
	}

	attachAnalyzers(analyzers) {
		analyzers.forEach((a) => {
			if (a.type === 'move') {
				this.moveAnalyzers.push(a);
			} else if (a.type === 'game') {
				this.gameAnalyzers.push(a);
			}
		});
	}

	/**
	 * Main analysis function for multithreading. Replays every game in the file and tracks statistics
	 * @param {string} path Path to the PGN file.
	 * @param {Function} config.filter - Filter function for selecting games
	 * @param {Number} config.cntGames - Max amount of games to process
	 * @param {Array<object>} analyzer An array of tracker objects. The data in the
	 *  analyzers is processed by reference.
	 * @param {number} batchSize Amount of games every worker shall process.
	 * @param {number} nThreads Amount of parallel threads that are started, when
	 * batchSize * nThreads games have been read in.
	 * @returns {Promise}
	 */
	static async processPGNMultiCore(
		path,
		config,
		analyzer,
		batchSize,
		nThreads
	) {
		try {
			let cntGameAnalyzer = 0;
			const gameAnalyzerStore = [];
			const moveAnalyzerStore = [];
			const analyzerNames = [];
			const analyzerConfigs = [];
			let cntGames = 0;
			let cntMoves = 0;
			let readerFinished = false;
			let customPath = '';

			const status = new EventEmitter();

			cluster.setupPrimary({
				exec: `${__dirname}/Processor.worker.js`
			});

			// split game type trackers and move type trackers
			analyzer.forEach((a) => {
				if (a.type === 'game') {
					cntGameAnalyzer += 1;
					gameAnalyzerStore.push(a);
				} else if (a.type === 'move') {
					moveAnalyzerStore.push(a);
				}
				analyzerNames.push(a.constructor.name);
				analyzerConfigs.push(a.cfg);
				if (Object.prototype.hasOwnProperty.call(a, 'path')) {
					customPath = a.path;
				}
			});

			// creates a new worker, that will process an array of games
			const forkWorker = function (games) {
				const w = cluster.fork();

				// on worker finish
				w.on('message', function (msg) {
					// normally we could use w.send(...) outside of this listener
					// there is a bug in node though, which sometimes sends the data too early
					// --> wait until the worker sends a custom ready message
					// see: https://github.com/nodejs/node/issues/39854
					if (msg === 'readyForData') {
						w.send({
							games,
							customPath,
							analyzerNames,
							analyzerConfigs
						});
					} else {
						// add tracker data from this worker
						for (let i = 0; i < gameAnalyzerStore.length; i += 1) {
							gameAnalyzerStore[i].add(msg.gameAnalyzers[i]);
						}
						for (let i = 0; i < moveAnalyzerStore.length; i += 1) {
							moveAnalyzerStore[i].add(msg.moveAnalyzers[i]);
						}
						cntMoves += msg.cntMoves;

						w.kill();

						// if this worker was the last one, emit 'finished' event
						if (
							Object.keys(cluster.workers).length === 0 &&
							readerFinished
						) {
							status.emit('finished');
						}
					}
				});
			};

			const cfg = GameProcessor.checkConfig(config);

			let games = [];
			let game: Game = { moves: null };

			// init line reader
			const lr = createInterface({
				input: createReadStream(path),
				crlfDelay: Infinity
			});

			// on new line
			lr.on('line', (line) => {
				// data tag
				if (
					line.startsWith('[') &&
					(cfg.hasFilter || cntGameAnalyzer > 0)
				) {
					const key = line.match(/\[(.*?)\s/)[1];
					const value = line.match(/"(.*?)"/)[1];

					game[key] = value;

					// moves
				} else if (line.startsWith('1')) {
					game.moves = line
						.replace(/(\d+\.{1,3}\s)|(\{(.*?)\}\s)/g, '')
						.split(' ');

					if (cfg.filter(game) || !cfg.hasFilter) {
						cntGames += 1;
						games.push(game);

						// if enough games have been read in, start worker threads and let them analyze
						if (cntGames % (batchSize * nThreads) === 0) {
							for (let i = 0; i < nThreads; i += 1) {
								forkWorker(
									games.slice(
										i * batchSize,
										i * batchSize + batchSize
									)
								);
							}

							games = [];
						}
					}

					game = { moves: null };
				}
				if (cntGames >= cfg.cntGames) {
					lr.close();
					lr.removeAllListeners();
				}
			});

			await EventEmitter.once(lr, 'close');
			// if on end there are still unprocessed games, start a last worker batch
			if (games.length > 0) {
				if (games.length > batchSize) {
					const nEndForks = Math.ceil(games.length / batchSize);
					for (let i = 0; i < nEndForks; i += 1) {
						forkWorker(
							games.slice(
								i * batchSize,
								i * batchSize + batchSize
							)
						);
					}
				} else {
					forkWorker(games);
				}
			}
			readerFinished = true;
			await EventEmitter.once(status, 'finished');
			analyzer.forEach((a) => {
				if (a.finish) {
					a.finish();
				}
			});
			return {
				cntGames,
				cntMoves
			};
		} catch (err) {
			console.log(err);
			return { cntGames: -1, cntMoves: -1 };
		}
	}

	async processPGN(path, config, analyzers, refreshRate) {
		try {
			const cfg = GameProcessor.checkConfig(config);

			this.attachAnalyzers(analyzers);

			const cntGameAnalyers = this.gameAnalyzers.length;

			const lr = createInterface({
				input: createReadStream(path),
				crlfDelay: Infinity
			});

			let game: Game = { moves: null };

			lr.on('line', (line) => {
				// data tag
				if (
					line.startsWith('[') &&
					(cfg.hasFilter || cntGameAnalyers > 0)
				) {
					const key = line.match(/\[(.*?)\s/)[1];
					const value = line.match(/"(.*?)"/)[1];

					game[key] = value;

					// moves
				} else if (line.startsWith('1')) {
					game.moves = line
						.replace(/(\d+\.{1,3}\s)|(\{(.*?)\}\s)/g, '')
						.split(' ');

					if (cfg.filter(game) || !cfg.hasFilter) {
						this.processGame(game);
					}

					// emit event
					if (this.cntGames % refreshRate === 0) {
						this.emit('status', this.cntGames);
					}

					game = { moves: null };
				}
				if (this.cntGames >= cfg.cntGames) {
					lr.close();
					lr.removeAllListeners();
				}
			});

			await EventEmitter.once(lr, 'close');

			console.log('Read entire file.');

			// call finish routine for each analyzer
			this.gameAnalyzers.forEach((a) => {
				if (a.finish) {
					a.finish();
				}
			});
			this.moveAnalyzers.forEach((a) => {
				if (a.finish) {
					a.finish();
				}
			});
			return { cntGames: this.cntGames, cntMoves: this.cntMoves };
		} catch (err) {
			console.error(err);
			return { cntGames: -1, cntMoves: -1 };
		}
	}

	processGame(game) {
		const { moves } = game;
		for (let i = 0; i < moves.length; i += 1) {
			this.activePlayer = i % 2;

			let currentMove;
			try {
				// fetch move data into currentMove
				currentMove = this.parseMove(moves[i]);
			} catch (err) {
				console.log(game, i);
				throw err;
			}

			// move based analyzers
			this.moveAnalyzers.forEach((a) => {
				a.analyze(currentMove);
			});

			this.board.move(currentMove);
		}

		this.cntMoves += moves.length - 1; // don't count result (e.g. 1-0)
		this.cntGames += 1;
		this.board.reset();

		// game based analyzers
		this.gameAnalyzers.forEach((a) => {
			a.analyze(game);
		});
	}

	reset() {
		this.board.reset();
		this.activePlayer = 0;
	}

	/**
	 * Parses a move in string format to board coordinates. Wrapper function for
	 * the different move algorithms.
	 * @param {string} rawMove The move to be parsed, e.g. 'Ne5+'.
	 */
	parseMove(rawMove: string) {
		const token = rawMove.substring(0, 1);

		let currentMove = new MoveData();
		currentMove.san = GameProcessor.preProcess(rawMove);
		currentMove.player = this.activePlayer === 0 ? 'w' : 'b';

		// game end on '1-0', '0-1' or '1/2-1/2' (check for digit as first char)
		if (token.match(/\d/) === null) {
			if (token.toLowerCase() === token) {
				this.pawnMove(currentMove);
			} else if (token !== 'O') {
				this.pieceMove(currentMove);
			} else {
				currentMove.castles = currentMove.san;
			}
		}
		return currentMove;
	}

	/**
	 * Returns the board coordinates for the move if it is a pawn move.
	 * @param {string} moveSan The move to be parsed, e.g. 'e5'.
	 */
	pawnMove(moveData) {
		const direction = -2 * (this.activePlayer % 2) + 1;
		const from = [];
		const to = [];
		let move = moveData.san;
		let offset = 0;

		// takes
		if (move.includes('x')) {
			move = move.replace('x', '');

			to[0] = 8 - parseInt(move.substring(2, 3), 10);
			to[1] = files.indexOf(move.substring(1, 2));
			from[0] = to[0] + direction;
			from[1] = files.indexOf(move.substring(0, 1));

			// en passant
			if (this.board.tiles[to[0]][to[1]] === null) {
				offset = moveData.player === 'w' ? 1 : -1;
			}

			moveData.takes.piece = this.board.tiles[to[0] + offset][to[1]].name;
			moveData.takes.pos = [to[0] + offset, to[1]];

			// moves
		} else {
			const tarRow = 8 - parseInt(move.substring(1, 2), 10);
			const tarCol = files.indexOf(move.substring(0, 1));

			from[1] = tarCol;
			to[0] = tarRow;
			to[1] = tarCol;
			for (let i = tarRow + direction; i < 8 && i >= 0; i += direction) {
				if (this.board.tiles[i][tarCol] !== null) {
					if (this.board.tiles[i][tarCol].name.includes('P')) {
						from[0] = i;
						break;
					}
				}
			}
		}

		moveData.to = to;
		moveData.from = from;
		moveData.piece = this.board.tiles[from[0]][from[1]].name;

		// promotes
		if (move.includes('=')) {
			moveData.promotesTo = move.substring(move.length - 1, move.length);
		}
	}

	/**
	 * Returns the board coordinates for a piece (!= pawn) move.
	 * @param {string} moveSan The move to be parsed, e.g. 'Be3'.
	 */
	pieceMove(moveData) {
		let move = moveData.san;
		let takes = false;
		let coords: Coords = { from: [], to: [] };
		const token = move.substring(0, 1);

		// remove token
		move = move.substring(1, move.length);

		// takes
		if (move.includes('x')) {
			takes = true;
			move = move.replace('x', '');
		}

		// e.g. Re3f5
		if (move.length === 4) {
			coords.from[0] = 8 - parseInt(move.substring(1, 2), 10);
			coords.from[1] = files.indexOf(move.substring(0, 1));
			coords.to[0] = 8 - parseInt(move.substring(3, 4), 10);
			coords.to[1] = files.indexOf(move.substring(2, 3));

			// e.g. Ref3
		} else if (move.length === 3) {
			const tarRow = 8 - parseInt(move.substring(2, 3), 10);
			const tarCol = files.indexOf(move.substring(1, 2));
			let mustBeInRow = -1;
			let mustBeInCol = -1;

			// file is specified
			if (files.indexOf(move.substring(0, 1)) >= 0) {
				mustBeInCol = files.indexOf(move.substring(0, 1));

				// rank is specified
			} else {
				mustBeInRow = 8 - parseInt(move.substring(0, 1), 10);
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
			const tarRow = 8 - parseInt(move.substring(1, 2), 10);
			const tarCol = files.indexOf(move.substring(0, 1));
			coords = this.findPiece(
				tarRow,
				tarCol,
				-1,
				-1,
				token,
				moveData.player
			);
		}

		// set move data
		moveData.from = coords.from;
		moveData.to = coords.to;
		moveData.piece = this.board.tiles[coords.from[0]][coords.from[1]].name;
		if (takes) {
			moveData.takes.piece =
				this.board.tiles[moveData.to[0]][moveData.to[1]].name;
			moveData.takes.pos = moveData.to;
		}
	}

	/**
	 * Search algorithm to find a piece.
	 * @param {number} tarRow Target row for piece move.
	 * @param {number} tarCol Target column for piece move.
	 * @param {number} mustBeInRow Moving piece must be in this row. '-1' if unknown.
	 * @param {number} mustBeInCol Moving piece must be in this column. '-1' if unknown.
	 * @param {string} token Moving piece must be of this type, e.g 'R'.
	 * @returns {Object}
	 */
	findPiece(tarRow, tarCol, mustBeInRow, mustBeInCol, token, player): Coords {
		const color = player;
		const from: number[] = [];
		const to: number[] = [];
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
		from[0] = -1;
		from[1] = -1;
		to[0] = tarRow;
		to[1] = tarCol;

		// get array of positions of pieces of type <token>
		let validPieces: number[][] = Object.values(
			this.board.pieces.posMap[color][token]
		);

		// filter pieces that can reach target square
		if (validPieces.length > 1) {
			validPieces = validPieces.filter((val) => {
				const mustBeInFulfilled =
					(mustBeInRow === -1 || val[0] === mustBeInRow) &&
					(mustBeInCol === -1 || val[1] === mustBeInCol);
				return (
					((moveCfg[token].line &&
						(val[0] === tarRow || val[1] === tarCol)) ||
						(moveCfg[token].diag &&
							Math.abs(val[0] - tarRow) ===
								Math.abs(val[1] - tarCol)) ||
						(token === 'N' &&
							((Math.abs(val[0] - tarRow) === 2 &&
								Math.abs(val[1] - tarCol) === 1) ||
								(Math.abs(val[0] - tarRow) === 1 &&
									Math.abs(val[1] - tarCol) === 2)))) &&
					mustBeInFulfilled
				);
			});
		}

		if (validPieces.length === 1) {
			return {
				from: validPieces[0],
				to
			};
		}

		if (validPieces.length > 1) {
			for (let idx = 0; idx < validPieces.length - 1; idx += 1) {
				const piece = validPieces[idx];
				let obstructed = false;

				if (token !== 'N') {
					const diff = [tarRow - piece[0], tarCol - piece[1]];
					const steps = Math.max.apply(null, diff.map(Math.abs));
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

				if (!obstructed && !this.checkCheck(piece, to, player)) {
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

		throw new MoveNotFoundException(token, tarRow, tarCol, this);
	}

	/**
	 * Checks if the input move would be resulting with the king being in check.
	 * @param {Number[]} from Coordinates of the source tile of the move that shall be checked.
	 *  @param {Number[]} to Coordinates of the target tile of the move that shall be checked.
	 * @returns {boolean} After the move, the king will be in check true/false.
	 */
	checkCheck(from, to, player) {
		const color = player;
		const opColor = player === 'w' ? 'b' : 'w';
		const king = this.board.pieces.posMap[color].K.Ke;
		let isInCheck = false;

		// if king move, no check is possible, exit function
		if (king[0] === from[0] && king[1] === from[1]) return false;

		// check if moving piece is on same line/diag as king, else exit
		const diff = [];
		diff[0] = from[0] - king[0];
		diff[1] = from[1] - king[1];
		const checkFor = [];
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
					(piece.name.includes(checkFor[0]) ||
						piece.name.includes(checkFor[1])) &&
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

	static algebraicToCoords(square) {
		const coords = [];
		const temp = square.split('');
		coords.push(8 - temp[1]);
		coords.push(files.indexOf(temp[0]));

		return coords;
	}

	static coordsToAlgebraic(coords) {
		let name = files[coords[1]];
		name += 8 - coords[0];
		return name;
	}

	/**
	 * Removes special characters like '#', '+', '?' and '!'
	 * @param {string} move The move to be cleaned up
	 * @returns {string} The input string with removed special characters
	 */
	static preProcess(move) {
		return move.replace(/#|\+|\?|!/g, '');
	}
}

export default GameProcessor;
