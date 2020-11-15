/* eslint-disable no-inner-declarations */
import ChessBoard from './ChessBoard';

const LineByLineReader = require('line-by-line');
const EventEmitter = require('events');

const files = 'abcdefgh';

const cluster = require('cluster');

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
	static processPGNMultiCore(path, config, analyzer, batchSize, nThreads) {
		return new Promise((resolve) => {
			let cntGameAnalyzer = 0;
			const gameAnalyzerStore = [];
			const moveAnalyzerStore = [];
			const analyzerNames = [];
			const analyzerConfigs = [];
			let cntGames = 0;
			let cntMoves = 0;
			let readerFinished = false;
			let customPath = '';

			// eslint-disable-next-line no-undef
			cluster.setupMaster({
				exec: `${__dirname}/worker.js`
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

			// checks if all games have been processed
			function checkAllWorkersFinished() {
				if (
					Object.keys(cluster.workers).length === 0 &&
					readerFinished
				) {
					// call finish function for each tracker
					analyzer.forEach((a) => {
						if (a.finish) {
							a.finish();
						}
					});
					resolve({
						cntGames,
						cntMoves
					});
				}
			}

			// adds the tracker data of one worker to the master tracker
			function addTrackerData(gameTracker, moveTracker, nMoves) {
				for (let i = 0; i < gameAnalyzerStore.length; i += 1) {
					gameAnalyzerStore[i].add(gameTracker[i]);
				}
				for (let i = 0; i < moveAnalyzerStore.length; i += 1) {
					moveAnalyzerStore[i].add(moveTracker[i]);
				}
				cntMoves += nMoves;
			}

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
					addTrackerData(
						msg.gameAnalyzers,
						msg.moveAnalyzers,
						msg.cntMoves
					);

					w.kill();

					// if all workers finished, resolve promise
					checkAllWorkersFinished();
				});
			}

			const cfg = GameProcessor.checkConfig(config);

			let games = [];
			let game = {};

			// init line-by-line reader
			const lr = new LineByLineReader(path, {
				skipEmptyLines: true
			});

			// on error
			lr.on('error', (err) => {
				console.log(err);
			});

			// on new line
			lr.on('line', (line) => {
				lr.pause();

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
					lr.end();
				} else {
					lr.resume();
				}
			});

			lr.on('end', () => {
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
				checkAllWorkersFinished();
			});
		});
	}

	processPGN(path, config, analyzers, refreshRate) {
		const cfg = GameProcessor.checkConfig(config);

		this.attachAnalyzers(analyzers);

		const cntGameAnalyers = this.gameAnalyzers.length;

		return new Promise((resolve, reject) => {
			const lr = new LineByLineReader(path, { skipEmptyLines: true });
			let game = {};

			// process current line
			const processLine = (line) => {
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
					lr.end();
				} else {
					lr.resume();
				}
			};

			lr.on('error', (err) => {
				console.log(err);
				reject();
			});

			lr.on('line', (line) => {
				// pause emitting of lines...
				lr.pause();

				processLine(line);
			});

			lr.on('end', () => {
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
				resolve({ cntGames: this.cntGames, cntMoves: this.cntMoves });
			});
		});
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

			this.currentMove.takes.piece = this.board.tiles[to[0] + offset][
				to[1]
			].name;
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
		this.currentMove.piece = this.board.tiles[coords.from[0]][
			coords.from[1]
		].name;
		if (takes) {
			this.currentMove.takes.piece = this.board.tiles[
				this.currentMove.to[0]
			][this.currentMove.to[1]].name;
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
				const diff = [tarRow - piece[0], tarCol - piece[1]];
				const steps = Math.max.apply(null, diff.map(Math.abs));
				const dir = [Math.sign(diff[0]), Math.sign(diff[1])];
				let obstructed = false;
				if (token !== 'N') {
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
		if (diff[0] !== 0) diff[0] /= Math.abs(diff[0]);
		if (diff[1] !== 0) diff[1] /= Math.abs(diff[1]);

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
