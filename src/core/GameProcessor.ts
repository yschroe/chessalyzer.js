import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import { EventEmitter } from 'events';
import cluster from 'cluster';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { IMoveData } from '../interfaces/Interface.js';
import { IBaseTracker } from '../interfaces/Interface.js';
import ChessBoard from './ChessBoard.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const files = 'abcdefgh';

class MoveNotFoundException extends Error {
	constructor(token: any, tarRow: any, tarCol: any) {
		super(`No piece for move ${token} to (${tarRow},${tarCol}) found!`);
		this.name = 'MoveNotFoundError';
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

interface Move {
	from: number[];
	to: number[];
}

class MoveData implements IMoveData {
	san: string;
	player: string;
	piece: string;
	castles: string;
	takes: { piece: string; pos: number[] };
	promotesTo: string;
	from: number[];
	to: number[];

	constructor() {
		this.san = '';
		this.player = '';
		this.piece = '';
		this.castles = '';
		this.takes = null;
		this.promotesTo = '';
		this.from = [-1, -1];
		this.to = [-1, -1];
	}
}

/**
 * Class that processes games.
 */
class GameProcessor {
	board: ChessBoard;
	activePlayer: number;
	cntMoves: number;
	cntGames: number;
	gameAnalyzers: IBaseTracker[];
	moveAnalyzers: IBaseTracker[];
	analyzerNames: string[];
	analyzerConfigs: object[];

	constructor() {
		this.board = new ChessBoard();
		this.activePlayer = 0;
		this.cntMoves = 0;
		this.cntGames = 0;
		this.gameAnalyzers = [];
		this.moveAnalyzers = [];
		this.analyzerNames = [];
		this.analyzerConfigs = [];
	}

	static checkConfig(config: any) {
		let hasFilter = Object.prototype.hasOwnProperty.call(config, 'filter');
		const cfg: GameProcessorConfig = {
			hasFilter,
			filter: hasFilter ? config.filter : () => true,
			cntGames: Object.prototype.hasOwnProperty.call(config, 'cntGames')
				? config.cntGames
				: Infinity
		};
		return cfg;
	}

	attachAnalyzers(analyzers: IBaseTracker[]) {
		analyzers.forEach((a) => {
			if (a.type === 'move') {
				this.moveAnalyzers.push(a);
			} else if (a.type === 'game') {
				this.gameAnalyzers.push(a);
			}
			this.analyzerNames.push(a.constructor.name);
			this.analyzerConfigs.push(a.cfg);
		});
	}

	async processPGN(
		path: string,
		analyzer: IBaseTracker[],
		config: any,
		batchSize: number,
		nThreads: number
	) {
		try {
			let cntGames = 0;
			let cntMoves = 0;
			let readerFinished = false;
			let customPath = '';

			const status = new EventEmitter();

			cluster.setupPrimary({
				exec: `${__dirname}/Processor.worker.js`
			});

			const cfg = GameProcessor.checkConfig(config);

			this.attachAnalyzers(analyzer);

			// creates a new worker, that will process an array of games
			const forkWorker = (games: string[]) => {
				const w = cluster.fork();

				// on worker finish
				w.on('message', (msg) => {
					// normally we could use w.send(...) outside of this listener
					// there is a bug in node though, which sometimes sends the data too early
					// --> wait until the worker sends a custom ready message
					// see: https://github.com/nodejs/node/issues/39854
					if (msg === 'readyForData') {
						w.send({
							games,
							customPath,
							analyzerNames: this.analyzerNames,
							analyzerConfigs: this.analyzerConfigs
						});
					} else {
						// add tracker data from this worker
						for (let i = 0; i < this.gameAnalyzers.length; i += 1) {
							this.gameAnalyzers[i].add(msg.gameAnalyzers[i]);
						}
						for (let i = 0; i < this.moveAnalyzers.length; i += 1) {
							this.moveAnalyzers[i].add(msg.moveAnalyzers[i]);
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
					(cfg.hasFilter || this.gameAnalyzers.length > 0)
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

	async processPGNSingleThreaded(
		path: string,
		config,
		analyzers: IBaseTracker[]
	) {
		try {
			const cfg = GameProcessor.checkConfig(config);

			this.attachAnalyzers(analyzers);

			const lr = createInterface({
				input: createReadStream(path),
				crlfDelay: Infinity
			});

			let game: Game = { moves: null };

			lr.on('line', (line) => {
				// data tag
				if (
					line.startsWith('[') &&
					(cfg.hasFilter || this.gameAnalyzers.length > 0)
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
				a.finish();
			});
			this.moveAnalyzers.forEach((a) => {
				a.finish();
			});

			return { cntGames: this.cntGames, cntMoves: this.cntMoves };
		} catch (err) {
			console.error(err);
			return { cntGames: -1, cntMoves: -1 };
		}
	}

	processGame(game) {
		const { moves } = game;
		try {
			for (let i = 0; i < moves.length; i += 1) {
				this.activePlayer = i % 2;

				// fetch move data into currentMove
				const currentMove = this.parseMove(moves[i]);

				// move based analyzers
				this.moveAnalyzers.forEach((a) => {
					a.analyze(currentMove);
				});

				this.board.move(currentMove);
			}
		} catch (err) {
			console.log(err, game);
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

	pawnMove(moveData: MoveData) {
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

			moveData.takes = {
				piece: this.board.tiles[to[0] + offset][to[1]].name,
				pos: [to[0] + offset, to[1]]
			};

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

	pieceMove(moveData: MoveData) {
		let move = moveData.san;
		let takes = false;
		let coords: Move = { from: [], to: [] };
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
			let mustBeInRow: number = null;
			let mustBeInCol: number = null;

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
				null,
				null,
				token,
				moveData.player
			);
		}

		// set move data
		moveData.from = coords.from;
		moveData.to = coords.to;
		moveData.piece = this.board.tiles[coords.from[0]][coords.from[1]].name;
		if (takes) {
			moveData.takes = {
				piece: this.board.tiles[moveData.to[0]][moveData.to[1]].name,
				pos: moveData.to
			};
		}
	}

	findPiece(
		tarRow: number,
		tarCol: number,
		mustBeInRow: number,
		mustBeInCol: number,
		token: string,
		player: string
	): Move {
		const color = player;
		const to = [tarRow, tarCol];

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

		// get array of positions of pieces of type <token>
		let validPieces: number[][] = Object.values(
			this.board.pieces.posMap[color][token]
		);

		// filter pieces that can reach target square
		if (validPieces.length > 1) {
			validPieces = validPieces.filter((val) => {
				const mustBeInFulfilled =
					(mustBeInRow === null || val[0] === mustBeInRow) &&
					(mustBeInCol === null || val[1] === mustBeInCol);
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

	checkCheck(move: Move, player: string) {
		const { from } = move;
		const { to } = move;
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

	static algebraicToCoords(square: string) {
		const coords = [];
		const temp = square.split('');
		coords.push(8 - Number(temp[1]));
		coords.push(files.indexOf(temp[0]));

		return coords;
	}

	static coordsToAlgebraic(coords: number[]) {
		let name = files[coords[1]];
		name += 8 - coords[0];
		return name;
	}

	static preProcess(move: string) {
		return move.replace(/#|\+|\?|!/g, '');
	}
}

export default GameProcessor;
