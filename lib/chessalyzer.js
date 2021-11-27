import { performance } from 'perf_hooks';
import { createReadStream, writeFile, readFileSync } from 'fs';
import chalk from 'chalk';
import { createInterface } from 'readline';
import EventEmitter from 'events';
import cluster from 'cluster';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const pawnTemplate$3 = ['Pa', 'Pb', 'Pc', 'Pd', 'Pe', 'Pf', 'Pg', 'Ph'];
const pieceTemplate$3 = ['Ra', 'Nb', 'Bc', 'Qd', 'Ke', 'Bf', 'Ng', 'Rh'];

class PiecePositionTable {
	constructor() {
		this.posMap = {
			w: {
				R: {
					Ra: [7, 0],
					Rh: [7, 7]
				},
				N: {
					Nb: [7, 1],
					Ng: [7, 6]
				},
				B: {
					Bc: [7, 2],
					Bf: [7, 5]
				},
				Q: {
					Qd: [7, 3]
				},
				K: {
					Ke: [7, 4]
				}
			},
			b: {
				R: {
					Ra: [0, 0],
					Rh: [0, 7]
				},
				N: {
					Nb: [0, 1],
					Ng: [0, 6]
				},
				B: {
					Bc: [0, 2],
					Bf: [0, 5]
				},
				Q: {
					Qd: [0, 3]
				},
				K: {
					Ke: [0, 4]
				}
			}
		};
	}

	takes(player, piece) {
		if (!piece.includes('P')) {
			delete this.posMap[player][piece.substring(0, 1)][piece];
		}
	}

	moves(player, piece, to) {
		if (!piece.includes('P')) {
			this.posMap[player][piece.substring(0, 1)][piece] = to;
		}
	}

	promotes(player, piece, on) {
		if (!piece.includes('P')) {
			this.posMap[player][piece.substring(0, 1)][piece] = on;
		}
	}
}

class ChessPiece {
	constructor(name, color) {
		this.name = name;
		this.color = color;
	}
}

class ChessBoard {
	constructor() {
		this.tiles = new Array(8);
		for (let row = 0; row < 8; row += 1) {
			const currRow = new Array(8);
			for (let col = 0; col < 8; col += 1) {
				currRow[col] = null;
				const color = row === 0 || row === 1 ? 'b' : 'w';

				// init pieces
				if (row === 0 || row === 7) {
					currRow[col] = new ChessPiece(pieceTemplate$3[col], color);
				} else if (row === 1 || row === 6) {
					currRow[col] = new ChessPiece(pawnTemplate$3[col], color);
				}
			}
			this.tiles[row] = currRow;
		}

		this.defaultTiles = this.tiles.map((arr) => arr.slice());
		this.pieces = new PiecePositionTable();
		this.promoteCounter = 0;
	}

	move(moveData) {
		const { from } = moveData;
		const { to } = moveData;

		// === castles ===
		if (moveData.castles) {
			this.castle(moveData.castles, moveData.player);

			// moves/takes
		} else if (from[0] !== -1) {
			// === takes ===
			if (moveData.takes.pos) {
				// update piece map
				this.pieces.takes(
					moveData.player === 'w' ? 'b' : 'w',
					moveData.takes.piece
				);

				// update board
				this.tiles[moveData.takes.pos[0]][moveData.takes.pos[1]] = null;
			}
			// === moves ===
			// update piece map
			this.pieces.moves(moveData.player, moveData.piece, to);

			// update board
			this.tiles[to[0]][to[1]] = this.tiles[from[0]][from[1]];
			this.tiles[from[0]][from[1]] = null;

			if (moveData.promotesTo) {
				const pieceName = `${moveData.promotesTo}${this.promoteCounter}`;
				this.tiles[to[0]][to[1]] = new ChessPiece(
					pieceName,
					moveData.player
				);
				this.pieces.promotes(moveData.player, pieceName, to);
				this.promoteCounter += 1;
			}
		}
	}

	castle(move, player) {
		const row = player === 'w' ? 7 : 0;
		const scrKingCol = 4;
		let tarKingCol = 6;
		let srcRookCol = 7;
		let tarRookCol = 5;

		if (move === 'O-O-O') {
			tarKingCol = 2;
			tarRookCol = 3;
			srcRookCol = 0;
		}
		// move king
		this.pieces.moves(player, 'Ke', [row, tarKingCol]);
		this.tiles[row][tarKingCol] = this.tiles[row][scrKingCol];
		this.tiles[row][scrKingCol] = null;

		// move rook
		this.pieces.moves(player, this.tiles[row][srcRookCol].name, [
			row,
			tarRookCol
		]);
		this.tiles[row][tarRookCol] = this.tiles[row][srcRookCol];
		this.tiles[row][srcRookCol] = null;
	}

	reset() {
		this.tiles = this.defaultTiles.map((arr) => arr.slice());
		this.pieces = new PiecePositionTable();
		this.promoteCounter = 0;
	}

	/** Prints the current board position to the console. */
	printPosition() {
		for (let row = 0; row < 8; row += 1) {
			for (let col = 0; col < 8; col += 1) {
				const piece = this.tiles[row][col];
				if (piece !== null) {
					process.stdout.write(`|${piece.color}${piece.name}|`);
				} else {
					process.stdout.write('|...|');
				}
			}
			process.stdout.write('\n');
		}
	}
}

/* eslint-disable no-inner-declarations */

const __dirname = dirname(fileURLToPath(import.meta.url));

const files = 'abcdefgh';

class MoveData {
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
	constructor() {
		super();
		this.board = new ChessBoard();
		this.currentMove = new MoveData();
		this.activePlayer = 0;
		this.cntMoves = 0;
		this.cntGames = 0;
		this.gameAnalyzers = [];
		this.moveAnalyzers = [];
	}

	static checkConfig(config) {
		const cfg = {};
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

			// eslint-disable-next-line no-undef
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
			function forkWorker(games) {
				const w = cluster.fork();

				// send data to worker
				w.send({
					games,
					customPath,
					analyzerNames,
					analyzerConfigs
				});

				// on worker finish
				w.on('message', (msg) => {
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
				});
			}

			const cfg = GameProcessor.checkConfig(config);

			let games = [];
			let game = {};

			// init line-by-line reader
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
						.replace(/\{(.*?)\}\s/g, '')
						.replace(/\d+\.+\s/g, '')
						.replace(' *', '')
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

					game = {};
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

			let game = {};

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
						.replace(/\{(.*?)\}\s/g, '')
						.replace(/\d+\.+\s/g, '')
						.replace(' *', '')
						.split(' ');

					if (cfg.filter(game) || !cfg.hasFilter) {
						this.processGame(game);
					}

					// emit event
					if (this.cntGames % refreshRate === 0) {
						this.emit('status', this.cntGames);
					}

					game = {};
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

			// fetch move data into this.currentMove
			this.parseMove(moves[i]);

			// move based analyzers
			this.moveAnalyzers.forEach((a) => {
				a.analyze(this.currentMove);
			});

			this.board.move(this.currentMove);
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
	parseMove(rawMove) {
		const token = rawMove.substring(0, 1);
		const move = GameProcessor.preProcess(rawMove);

		this.currentMove = new MoveData();
		this.currentMove.san = rawMove;
		this.currentMove.player = this.activePlayer === 0 ? 'w' : 'b';

		// game end on '1-0', '0-1' or '1/2-1/2' (check for digit as first char)
		if (token.match(/\d/) === null) {
			if (token.toLowerCase() === token) {
				this.pawnMove(move);
			} else if (token !== 'O') {
				this.pieceMove(move);
			} else {
				this.currentMove.castles = move;
			}
		}
	}

	/**
	 * Returns the board coordinates for the move if it is a pawn move.
	 * @param {string} moveSan The move to be parsed, e.g. 'e5'.
	 */
	pawnMove(moveSan) {
		const direction = -2 * (this.activePlayer % 2) + 1;
		const from = [];
		const to = [];
		let move = moveSan;
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
				offset = this.currentMove.player === 'w' ? 1 : -1;
			}

			this.currentMove.takes.piece =
				this.board.tiles[to[0] + offset][to[1]].name;
			this.currentMove.takes.pos = [to[0] + offset, to[1]];

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

		this.currentMove.to = to;
		this.currentMove.from = from;
		this.currentMove.piece = this.board.tiles[from[0]][from[1]].name;

		// promotes
		if (move.includes('=')) {
			this.currentMove.promotesTo = move.substring(
				move.length - 1,
				move.length
			);
		}
	}

	/**
	 * Returns the board coordinates for a piece (!= pawn) move.
	 * @param {string} moveSan The move to be parsed, e.g. 'Be3'.
	 */
	pieceMove(moveSan) {
		let move = moveSan;
		let takes = false;
		let coords = { from: [], to: [] };
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
				token
			);

			// e.g. Rf3
		} else {
			const tarRow = 8 - parseInt(move.substring(1, 2), 10);
			const tarCol = files.indexOf(move.substring(0, 1));
			coords = this.findPiece(tarRow, tarCol, -1, -1, token);
		}

		// set move data
		this.currentMove.from = coords.from;
		this.currentMove.to = coords.to;
		this.currentMove.piece =
			this.board.tiles[coords.from[0]][coords.from[1]].name;
		if (takes) {
			this.currentMove.takes.piece =
				this.board.tiles[this.currentMove.to[0]][
					this.currentMove.to[1]
				].name;
			this.currentMove.takes.pos = this.currentMove.to;
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
	findPiece(tarRow, tarCol, mustBeInRow, mustBeInCol, token) {
		const color = this.currentMove.player;
		const from = [];
		const to = [];
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
		let validPieces = Object.values(this.board.pieces.posMap[color][token]);

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

				if (!obstructed && !this.checkCheck(piece, to)) {
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

		console.log(
			`Error: no piece for move ${token} to (${tarRow},${tarCol}) found!`
		);
		console.log(this.cntGames);
		console.log(this.currentMove);
		this.board.printPosition();

		return { from, to };
	}

	/**
	 * Checks if the input move would be resulting with the king being in check.
	 * @param {Number[]} from Coordinates of the source tile of the move that shall be checked.
	 *  @param {Number[]} to Coordinates of the target tile of the move that shall be checked.
	 * @returns {boolean} After the move, the king will be in check true/false.
	 */
	checkCheck(from, to) {
		const color = this.currentMove.player;
		const opColor = this.currentMove.player === 'w' ? 'b' : 'w';
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

const pawnTemplate$2 = ['Pa', 'Pb', 'Pc', 'Pd', 'Pe', 'Pf', 'Pg', 'Ph'];
const pieceTemplate$2 = ['Ra', 'Nb', 'Bc', 'Qd', 'Ke', 'Bf', 'Ng', 'Rh'];

/** Main class for batch processing and generating heat maps */
class Chessalyzer {
	/**
	 * Starts the singlethreaded batch processing for the selected file
	 * @param {string} path - Path to the PGN file that should be analyzed
	 * @param {(Object|Object[])} analyzer - The analysis functions that shall be run
	 *  during batch processing. Can be one single analyzer or an array of analyzers.
	 * @param {Object} [cfg = {}]
	 * @param {Function} [cfg.filter = ()=>true] - Filter function for selecting games
	 * @param {number} [cfg.cntGames = Infinite ] - Max amount of games to process
	 * @param {Object} callback - Callback object
	 * @param {Function} [callback.fun] - Callback function that is called every callback.rate games
	 * @param {number} [callback.rate] - Every 'rate' games the callback function is called.
	 * @returns {Promise}
	 */
	static async startBatch(
		path,
		analyzer,
		cfg = {},
		callback = { fun: () => {}, rate: 250 }
	) {
		// check if single analyzer or array is passed
		let analyzerArray = analyzer;
		if (!Array.isArray(analyzerArray)) {
			analyzerArray = [analyzer];
		}

		const gameProcessor = new GameProcessor();

		// callback handler
		gameProcessor.on('status', (gameCnt) => {
			callback.fun(gameCnt);
		});

		const t0 = performance.now();

		const header = await gameProcessor.processPGN(
			path,
			cfg,
			analyzerArray,
			callback.rate
		);

		const t1 = performance.now();
		const tdiff = Math.round(t1 - t0) / 1000;
		const mps = Math.round(header.cntMoves / tdiff);

		console.log(
			`${header.cntGames} games (${header.cntMoves} moves) processed in ${tdiff}s (${mps} moves/s)`
		);
		return header;
	}

	/**
	 * Starts the multithreaded batch processing for the selected file
	 * @param {string} path - Path to the PGN file that should be analyzed
	 * @param {(Object|Object[])} analyzer - The analysis functions that shall be run
	 *  during batch processing. Can be one single analyzer or an array of analyzers.
	 * @param {Function} [cfg.filter = ()=>true] - Filter function for selecting games
	 * @param {number} [cfg.cntGames = Infinite ] - Max amount of games to process
	 * @param {number} [batchSize = 8000] Amount of games per thread.
	 * @param {number} [nThreads = 1] numbers of additional threads to use.
	 * @returns {Promise}
	 */
	static async startBatchMultiCore(
		path,
		analyzer,
		cfg = {},
		batchSize = 8000,
		nThreads = 1
	) {
		// check if single analyzer or array is passed
		let analyzerArray = analyzer;
		if (!Array.isArray(analyzerArray)) {
			analyzerArray = [analyzer];
		}
		const t0 = performance.now();

		const header = await GameProcessor.processPGNMultiCore(
			path,
			cfg,
			analyzerArray,
			batchSize,
			nThreads
		);
		const t1 = performance.now();
		const tdiff = Math.round(t1 - t0) / 1000;
		const mps = Math.round(header.cntMoves / tdiff);

		console.log(
			`${header.cntGames} games (${header.cntMoves} moves) processed in ${tdiff}s (${mps} moves/s)`
		);
		header.mps = mps;
		return header;
	}

	/**
	 * Saves a completed batch run to a JSON file
	 * @param {string} path - Path the data file shall be saved to
	 * @param {Object} data - The data that shall be saved
	 */
	static saveData(path, data) {
		writeFile(path, JSON.stringify(data), (err) => {
			if (err) {
				console.error(err);
				return;
			}
			console.log('File has been created.');
		});
	}

	/**
	 * Loads the stats of a previous batch run (JSON) to a data bank
	 * @param {string} path - Path the data file shall be loaded from
	 * @returns {Object} Returns the loaded data
	 */
	static loadData(path) {
		const data = JSON.parse(readFileSync(path, 'utf8'));
		console.log(`File '${path}' has been loaded.`);
		return data;
	}

	/**
	 * Generates a heatmap out of the tracked data.
	 * @param {Object} data - Where the data shall be taken from
	 * @param {(string|number[])} square - The square the data shall be generated for.
	 * For example, if you wanted to know how often a specific piece was on a specific tile,
	 * you would pass the identifier of the tile to the function, e.g. "a2" or [7,1].
	 * @param {Function} fun - The evaluation function that generates the heatmap out of the
	 * data.
	 * See ./src/exampleHeatmapConfig for examples of such a function.
	 * @param {*} [optData = {}] - Optional data you may need in your eval function
	 * @returns {Object} Array with 3 entries:
	 * <ol>
	 * <li>map: 8x8 Array containing the heat map values for each tile</li>
	 * <li>min: The minimum value in the heatmap.</li>
	 * <li>max: The maximum value in the heatmap.</li>
	 * </ol>
	 */
	static generateHeatmap(data, square, fun, optData = {}) {
		let sqrCoords;
		let sqrAlg;

		// square input type 'a2'
		if (typeof square === 'string') {
			sqrCoords = GameProcessor.algebraicToCoords(square);
			sqrAlg = square;

			// input type [6,0]
		} else {
			sqrCoords = square;
			sqrAlg = GameProcessor.coordsToAlgebraic(square);
		}

		const startingPiece = Chessalyzer.getStartingPiece(sqrCoords);
		const sqrData = {
			alg: sqrAlg,
			coords: sqrCoords,
			piece: startingPiece
		};
		const map = [];
		let max = 0;
		let min = 1000000;

		for (let i = 0; i < 8; i += 1) {
			const dataRow = new Array(8);
			for (let j = 0; j < 8; j += 1) {
				const loopSqrCoords = [i, j];
				const loopSqrAlg =
					GameProcessor.coordsToAlgebraic(loopSqrCoords);
				const loopPiece = Chessalyzer.getStartingPiece(loopSqrCoords);
				const loopSqrData = {
					alg: loopSqrAlg,
					coords: loopSqrCoords,
					piece: loopPiece
				};

				dataRow[j] = fun(data, sqrData, loopSqrData, optData);
				if (dataRow[j] > max) max = dataRow[j];
				if (dataRow[j] < min) min = dataRow[j];
			}
			map.push(dataRow);
		}

		return { map, min, max };
	}

	/**
	 * Generates a comparison heatmap out of the tracked data. There needs to data in both
	 * banks you pass as bank1 and bank2 params. The heatmap for both banks is calculated
	 * and then the relative differences between both banks are calculated. For example,
	 * if the heatmap value for "a1" of bank1 is 10 and the value of bank2 is 5, the returned
	 * value for "a1" would be 100% ([[10/5] -1] *100).
	 * @param {Object} data1 - Dataset 1
	 * @param {Object} data2 - Dataset 2
	 * @param {(string|number[])} square - The square the data shall be generated for. Notation
	 * can be 'a1' or [7,0].
	 * @param {Function} fun - The evaluation function that generates the heatmap out of the
	 * saved data. See {@link generateHeatmap} for a more detailed description.
	 * @param {*} [optData = {}] - Optional data you may need in your eval function
	 * @returns {Object} Object with 3 entries:
	 * <ol>
	 * <li>map: 8x8 Array containing the heat map values for each tile</li>
	 * <li>min: The minimum value in the heatmap.</li>
	 * <li>max: The maximum value in the heatmap.</li>
	 * </ol>
	 */
	static generateComparisonHeatmap(data1, data2, square, fun, optData = {}) {
		const map = [];
		let max = 0;
		let min = 100000;

		// comparison heatmap
		const map0 = Chessalyzer.generateHeatmap(data1, square, fun, optData);
		const map1 = Chessalyzer.generateHeatmap(data2, square, fun, optData);

		for (let i = 0; i < 8; i += 1) {
			const dataRow = new Array(8);
			for (let j = 0; j < 8; j += 1) {
				const a = map0.map[i][j];
				const b = map1.map[i][j];
				if (a === 0 || b === 0) dataRow[j] = 0;
				else dataRow[j] = (a >= b ? a / b - 1 : -b / a + 1) * 100;

				if (dataRow[j] > max) max = dataRow[j];
				if (dataRow[j] < min) min = dataRow[j];
			}
			map.push(dataRow);
		}

		return { map, min, max };
	}

	/**
	 * Prints a heatmap to the terminal
	 * @param {number[][]} map - The heatmap data. An (8x8) Array containing values.
	 * @param {number} min - The minimum value in map.
	 * @param {number} max - The maximum value in map.
	 */
	static printHeatmap(map, min, max) {
		const color = [255, 128, 0];
		const bgColor = [255, 255, 255];
		for (let i = 0; i < map.length; i += 1) {
			for (let cnt = 0; cnt < 2; cnt += 1) {
				for (let j = 0; j < map[i].length; j += 1) {
					const alpha =
						max === 0 ? 0 : Math.sqrt(map[i][j] / max).toFixed(2);
					// const value = map[i][j].toFixed(2);
					const colorOut = [
						Math.round(color[0] * alpha + (1 - alpha) * bgColor[0]),
						Math.round(color[1] * alpha + (1 - alpha) * bgColor[1]),
						Math.round(color[2] * alpha + (1 - alpha) * bgColor[2])
					];

					process.stdout.write(
						chalk.bgRgb(
							colorOut[0],
							colorOut[1],
							colorOut[2]
						)('    ')
					);
				}
				process.stdout.write('\n');
			}
		}
	}

	static getStartingPiece(sqr) {
		let color = '';
		let name = '';
		if (sqr[0] === 0) {
			color = 'b';
			name = pieceTemplate$2[sqr[1]];
		} else if (sqr[0] === 1) {
			color = 'b';
			name = pawnTemplate$2[sqr[1]];
		} else if (sqr[0] === 6) {
			color = 'w';
			name = pawnTemplate$2[sqr[1]];
		} else if (sqr[0] === 7) {
			color = 'w';
			name = pieceTemplate$2[sqr[1]];
		}

		return { color, name };
	}
}

class BaseTracker {
	constructor(type) {
		this.type = type;
		this.cfg = {
			profilingActive: false
		};
		this.time = 0;
		this.t0 = 0;

		if (this.track === undefined) {
			throw new Error('Your analyzer must implement a track() method!');
		}
		if (this.type === undefined) {
			throw new Error('Your analyzer must specify a type!');
		}
	}

	analyze(data) {
		if (this.cfg.profilingActive) this.t0 = performance.now();
		this.track(data);
		if (this.cfg.profilingActive) this.time += performance.now() - this.t0;
	}
}

const pawnTemplate$1 = ['Pa', 'Pb', 'Pc', 'Pd', 'Pe', 'Pf', 'Pg', 'Ph'];
const pieceTemplate$1 = ['Ra', 'Nb', 'Bc', 'Qd', 'Ke', 'Bf', 'Ng', 'Rh'];

class PieceTrackerBase extends BaseTracker {
	constructor() {
		super('move');
		this.b = {};
		this.w = {};

		// first layer
		pawnTemplate$1.forEach((val) => {
			this.w[val] = {};
			this.b[val] = {};
		});
		pieceTemplate$1.forEach((val) => {
			this.w[val] = {};
			this.b[val] = {};
		});

		// second layer
		Object.keys(this.w).forEach((key) => {
			pawnTemplate$1.forEach((val) => {
				this.w[key][val] = 0;
				this.b[key][val] = 0;
			});
			pieceTemplate$1.forEach((val) => {
				this.w[key][val] = 0;
				this.b[key][val] = 0;
			});
		});
	}

	add(tracker) {
		this.time += tracker.time;

		pawnTemplate$1.forEach((pawn) => {
			pieceTemplate$1.forEach((piece) => {
				this.w[pawn][piece] += tracker.w[pawn][piece];
				this.b[pawn][piece] += tracker.b[pawn][piece];
			});
			pawnTemplate$1.forEach((pawn2) => {
				this.w[pawn][pawn2] += tracker.w[pawn][pawn2];
				this.b[pawn][pawn2] += tracker.b[pawn][pawn2];
			});
		});
		pieceTemplate$1.forEach((piece) => {
			pieceTemplate$1.forEach((piece2) => {
				this.w[piece][piece2] += tracker.w[piece][piece2];
				this.b[piece][piece2] += tracker.b[piece][piece2];
			});
			pawnTemplate$1.forEach((pawn) => {
				this.w[piece][pawn] += tracker.w[piece][pawn];
				this.b[piece][pawn] += tracker.b[piece][pawn];
			});
		});
	}

	track(moveData) {
		const { player } = moveData;
		const { piece } = moveData;
		const { takes } = moveData;

		if (takes.piece !== undefined) {
			if (
				piece.length > 1 &&
				takes.piece.length > 1 &&
				!piece.match(/\d/g) &&
				!takes.piece.match(/\d/g)
			) {
				this.processTakes(player, piece, takes.piece);
			}
		}
	}

	processTakes(player, takingPiece, takenPiece) {
		this[player][takingPiece][takenPiece] += 1;
	}
}

const pawnTemplate = ['Pa', 'Pb', 'Pc', 'Pd', 'Pe', 'Pf', 'Pg', 'Ph'];
const pieceTemplate = ['Ra', 'Nb', 'Bc', 'Qd', 'Ke', 'Bf', 'Ng', 'Rh'];

class TileStats {
	constructor() {
		this.movedTo = 0;
		this.wasOn = 0;
		this.killedOn = 0;
		this.wasKilledOn = 0;
	}
}

class Piece {
	constructor(piece, color) {
		this.piece = piece;
		this.color = color;
		this.lastMovedOn = 0;
	}
}

class TileTrackerBase extends BaseTracker {
	constructor() {
		super('move');
		this.cntMovesGame = 0;
		this.cntMovesTotal = 0;
		this.tiles = new Array(8);
		for (let row = 0; row < 8; row += 1) {
			const currRow = new Array(8);
			for (let col = 0; col < 8; col += 1) {
				currRow[col] = { b: {}, w: {} };

				currRow[col].b = new TileStats();
				currRow[col].w = new TileStats();
				pawnTemplate.forEach((val) => {
					currRow[col].b[val] = new TileStats();
					currRow[col].w[val] = new TileStats();
				});
				pieceTemplate.forEach((val) => {
					currRow[col].b[val] = new TileStats();
					currRow[col].w[val] = new TileStats();
				});
			}
			this.tiles[row] = currRow;
		}

		for (let row = 0; row < 8; row += 1) {
			for (let col = 0; col < 8; col += 1) {
				this.resetCurrentPiece(row, col);
			}
		}
	}

	add(tracker) {
		this.time += tracker.time;
		this.cntMovesGame += tracker.cntMovesGame;
		this.cntMovesTotal += tracker.cntMovesTotal;

		for (let row = 0; row < 8; row += 1) {
			for (let col = 0; col < 8; col += 1) {
				this.tiles[row][col].b.movedTo +=
					tracker.tiles[row][col].b.movedTo;
				this.tiles[row][col].w.movedTo +=
					tracker.tiles[row][col].w.movedTo;

				this.tiles[row][col].b.wasOn += tracker.tiles[row][col].b.wasOn;
				this.tiles[row][col].w.wasOn += tracker.tiles[row][col].w.wasOn;

				this.tiles[row][col].b.killedOn +=
					tracker.tiles[row][col].b.killedOn;
				this.tiles[row][col].w.killedOn +=
					tracker.tiles[row][col].w.killedOn;

				this.tiles[row][col].b.wasKilledOn +=
					tracker.tiles[row][col].b.wasKilledOn;
				this.tiles[row][col].w.wasKilledOn +=
					tracker.tiles[row][col].w.wasKilledOn;

				pawnTemplate.forEach((piece) => {
					this.tiles[row][col].b[piece].movedTo +=
						tracker.tiles[row][col].b[piece].movedTo;
					this.tiles[row][col].w[piece].movedTo +=
						tracker.tiles[row][col].w[piece].movedTo;

					this.tiles[row][col].b[piece].wasOn +=
						tracker.tiles[row][col].b[piece].wasOn;
					this.tiles[row][col].w[piece].wasOn +=
						tracker.tiles[row][col].w[piece].wasOn;

					this.tiles[row][col].b[piece].killedOn +=
						tracker.tiles[row][col].b[piece].killedOn;
					this.tiles[row][col].w[piece].killedOn +=
						tracker.tiles[row][col].w[piece].killedOn;

					this.tiles[row][col].b[piece].wasKilledOn +=
						tracker.tiles[row][col].b[piece].wasKilledOn;
					this.tiles[row][col].w[piece].wasKilledOn +=
						tracker.tiles[row][col].w[piece].wasKilledOn;
				});

				pieceTemplate.forEach((piece) => {
					this.tiles[row][col].b[piece].movedTo +=
						tracker.tiles[row][col].b[piece].movedTo;
					this.tiles[row][col].w[piece].movedTo +=
						tracker.tiles[row][col].w[piece].movedTo;

					this.tiles[row][col].b[piece].wasOn +=
						tracker.tiles[row][col].b[piece].wasOn;
					this.tiles[row][col].w[piece].wasOn +=
						tracker.tiles[row][col].w[piece].wasOn;

					this.tiles[row][col].b[piece].killedOn +=
						tracker.tiles[row][col].b[piece].killedOn;
					this.tiles[row][col].w[piece].killedOn +=
						tracker.tiles[row][col].w[piece].killedOn;

					this.tiles[row][col].b[piece].wasKilledOn +=
						tracker.tiles[row][col].b[piece].wasKilledOn;
					this.tiles[row][col].w[piece].wasKilledOn +=
						tracker.tiles[row][col].w[piece].wasKilledOn;
				});
			}
		}
	}

	resetCurrentPiece(row, col) {
		let color;
		let piece;
		let hasPiece = false;

		if (row === 0) {
			color = 'b';
			piece = pieceTemplate[col];
			hasPiece = true;
		} else if (row === 1) {
			color = 'b';
			piece = pawnTemplate[col];
			hasPiece = true;
		} else if (row === 6) {
			color = 'w';
			piece = pawnTemplate[col];
			hasPiece = true;
		} else if (row === 7) {
			color = 'w';
			piece = pieceTemplate[col];
			hasPiece = true;
		}

		if (hasPiece) {
			this.tiles[row][col].currentPiece = new Piece(piece, color);
		} else {
			this.tiles[row][col].currentPiece = null;
		}
	}

	track(moveData) {
		const { to } = moveData;
		const { from } = moveData;
		const { player } = moveData;
		const { piece } = moveData;
		const { takes } = moveData;
		const { castles } = moveData;

		// move
		if (to[0] !== -1) {
			this.cntMovesGame += 1;

			if (takes.piece !== undefined) {
				this.processTakes(takes.pos, player, piece, takes.piece);
			}

			this.processMove(from, to, player, piece);

			// castle
		} else if (castles !== '') {
			this.cntMovesGame += 1;

			const row = player === 'w' ? 7 : 0;
			let rook = 'Rh';
			let tarKingCol = 6;
			let tarRookCol = 5;
			let srcRookCol = 7;
			if (castles === 'O-O-O') {
				tarKingCol = 2;
				tarRookCol = 3;
				srcRookCol = 0;
				rook = 'Ra';
			}
			this.processMove([row, 4], [row, tarKingCol], player, 'Ke');
			this.processMove(
				[row, srcRookCol],
				[row, tarRookCol],
				player,
				rook
			);

			// game end
		} else {
			for (let row = 0; row < 8; row += 1) {
				for (let col = 0; col < 8; col += 1) {
					const { currentPiece } = this.tiles[row][col];
					if (currentPiece !== null) {
						this.addOccupation([row, col]);
					}
					this.resetCurrentPiece(row, col);
				}
			}
			this.cntMovesTotal += this.cntMovesGame;
			this.cntMovesGame = 0;
		}
	}

	processMove(from, to, player, piece) {
		if (piece.length > 1 && !piece.match(/\d/g)) {
			this.addOccupation(from);

			this.tiles[to[0]][to[1]].currentPiece =
				this.tiles[from[0]][from[1]].currentPiece;
			this.tiles[to[0]][to[1]].currentPiece.lastMovedOn =
				this.cntMovesGame;

			this.tiles[from[0]][from[1]].currentPiece = null;

			this.tiles[to[0]][to[1]][player].movedTo += 1;
			this.tiles[to[0]][to[1]][player][piece].movedTo += 1;
		}
	}

	processTakes(pos, player, takingPiece, takenPiece) {
		if (takenPiece.length > 1 && !takenPiece.match(/\d/g)) {
			const opPlayer = player === 'w' ? 'b' : 'w';
			this.tiles[pos[0]][pos[1]][opPlayer].wasKilledOn += 1;
			this.tiles[pos[0]][pos[1]][opPlayer][takenPiece].wasKilledOn += 1;

			this.addOccupation(pos);
			this.tiles[pos[0]][pos[1]].currentPiece = null;
		}

		if (takingPiece.length > 1 && !takingPiece.match(/\d/g)) {
			this.tiles[pos[0]][pos[1]][player].killedOn += 1;
			this.tiles[pos[0]][pos[1]][player][takingPiece].killedOn += 1;
		}
	}

	addOccupation(pos) {
		const { currentPiece } = this.tiles[pos[0]][pos[1]];
		const toAdd = this.cntMovesGame - currentPiece.lastMovedOn;
		this.tiles[pos[0]][pos[1]][currentPiece.color].wasOn += toAdd;
		this.tiles[pos[0]][pos[1]][currentPiece.color][
			currentPiece.piece
		].wasOn += toAdd;
	}
}

class GameTrackerBase extends BaseTracker {
	constructor() {
		super('game');
		this.wins = [0, 0, 0];
		this.cntGames = 0;
		this.ECO = {};
	}

	add(tracker) {
		this.wins[0] += tracker.wins[0];
		this.wins[1] += tracker.wins[1];
		this.wins[2] += tracker.wins[2];
		this.cntGames += tracker.cntGames;
		this.time += tracker.time;

		Object.keys(tracker.ECO).forEach((key) => {
			if (Object.prototype.hasOwnProperty.call(this.ECO, key)) {
				this.ECO[key] += tracker.ECO[key];
			} else {
				this.ECO[key] = tracker.ECO[key];
			}
		});
	}

	track(game) {
		this.cntGames += 1;
		switch (game.Result) {
			case '1-0':
				this.wins[0] += 1;
				break;

			case '1/2-1/2':
				this.wins[1] += 1;
				break;

			case '0-1':
				this.wins[2] += 1;
				break;
		}
		if (Object.prototype.hasOwnProperty.call(this.ECO, game.ECO)) {
			this.ECO[game.ECO] += 1;
		} else {
			this.ECO[game.ECO] = 1;
		}
	}

	finish() {
		// sort keys
		this.ECO = Object.keys(this.ECO)
			.sort()
			.reduce((accumulator, currentValue) => {
				accumulator[currentValue] = this.ECO[currentValue];
				return accumulator;
			}, {});
	}
}

const Tracker = {
	Game: GameTrackerBase,
	Piece: PieceTrackerBase,
	Tile: TileTrackerBase,
	Base: BaseTracker
};

export { Chessalyzer, Tracker };
