import ChessBoard from './ChessBoard';

const LineByLineReader = require('line-by-line');
const EventEmitter = require('events');

const files = 'abcdefgh';

/**
 * Class that processes games.
 */
class GameProcessor extends EventEmitter {
	constructor() {
		super();
		this.board = new ChessBoard();
		this.activePlayer = 0;
		this.cntMoves = 0;
		this.cntGames = 0;
	}

	static checkConfig(config) {
		const cfg = {};
		cfg.hasFilter = Object.prototype.hasOwnProperty.call(config, 'filter');
		cfg.filter = cfg.hasFilter ? config.filter : () => true;

		cfg.cntGames = Object.prototype.hasOwnProperty.call(config, 'cntGames')
			? config.cntGames
			: Infinity;

		cfg.stats = Object.prototype.hasOwnProperty.call(config, 'stats')
			? config.stats
			: {};

		// TODO: currently without function
		cfg.split = Object.prototype.hasOwnProperty.call(config, 'split')
			? config.split
			: false;

		return cfg;
	}

	processPGN(path, config, refreshRate) {
		const cfg = GameProcessor.checkConfig(config);

		this.board.setConfig(cfg.stats);

		return new Promise((resolve, reject) => {
			const lr = new LineByLineReader(path, { skipEmptyLines: true });
			let game = {};

			// process current line
			const processLine = (line) => {
				// data tag
				if (line.startsWith('[') && cfg.hasFilter) {
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
				resolve();
			});
		});
	}

	processGame(game) {
		const { moves } = game;

		for (let i = 0; i < moves.length; i += 1) {
			this.activePlayer = i % 2;
			const moveData = this.parseMove(moves[i]);
			this.board.move(moveData);
		}
		this.cntMoves += moves.length;
		this.cntGames += 1;
		this.board.reset();
	}

	reset() {
		this.board.reset();
		this.activePlayer = 0;
	}

	/**
	 * @typedef {Object} MoveData
	 * @property {Object[]} moves - Array of {from: [], to: []} objects
	 * @property {Boolean} takes - Move takes a piece true/false
	 * @property {String} promotes - Piece type in case of pawn promotion else null
	 */

	/**
	 * Parses a move in string format to board coordinates. Wrapper function for
	 *  the different move algorithms.
	 * @param {string} rawMove The move to be parsed, e.g. 'Ne5+'.
	 * @returns {MoveData}
	 */
	parseMove(rawMove) {
		const token = rawMove.substring(0, 1);
		let moveData = {};

		const move = GameProcessor.preProcess(rawMove);

		// game end on '1-0', '0-1' or '1/2-1/2' (check for digit as first char)
		if (token.match(/\d/) !== null) {
			moveData = null;
		} else if (token.toLowerCase() === token) {
			moveData = this.pawnMove(move);
		} else if (token !== 'O') {
			moveData = this.pieceMove(move);
		} else {
			moveData = this.castle(move);
		}

		return moveData;
	}

	/**
	 * Returns the board coordinates for the move if it is a pawn move.
	 * @param {string} moveSan The move to be parsed, e.g. 'e5'.
	 * @returns {MoveData}
	 */
	pawnMove(moveSan) {
		const from = [];
		const to = [];
		const moveData = {
			moves: [],
			takes: false,
			promotes: null
		};
		const direction = -2 * (this.activePlayer % 2) + 1;
		let move = moveSan;

		// takes
		if (move.includes('x')) {
			moveData.takes = true;
			move = move.replace('x', '');

			to[0] = 8 - parseInt(move.substring(2, 3), 10);
			to[1] = files.indexOf(move.substring(1, 2));
			from[0] = to[0] + direction;
			from[1] = files.indexOf(move.substring(0, 1));

			// moves
		} else {
			const tarRow = 8 - parseInt(move.substring(1, 2), 10);
			const tarCol = files.indexOf(move.substring(0, 1));

			from[1] = tarCol;
			to[0] = tarRow;
			to[1] = tarCol;
			for (let i = tarRow + direction; i < 8 && i >= 0; i += direction) {
				if (this.board.tiles[i][tarCol].piece !== null) {
					if (this.board.tiles[i][tarCol].piece.name.includes('P')) {
						from[0] = i;
						break;
					}
				}
			}
		}
		moveData.moves.push({ from, to });

		// promotes
		if (move.includes('=')) {
			moveData.promotes = move.substring(move.length - 1, move.length);
		}

		return moveData;
	}

	/**
	 * Returns the board coordinates for a piece (!= pawn) move.
	 * @param {string} moveSan The move to be parsed, e.g. 'Be3'.
	 * @returns {MoveData}
	 */
	pieceMove(moveSan) {
		const from = [];
		const to = [];
		const moveData = {
			moves: [],
			takes: false,
			promotes: null
		};
		let move = moveSan;
		const token = move.substring(0, 1);

		// remove token
		move = move.substring(1, move.length);

		// takes
		if (move.includes('x')) {
			moveData.takes = true;
			move = move.replace('x', '');
		}

		// e.g. Re3f5
		if (move.length === 4) {
			from[0] = 8 - parseInt(move.substring(1, 2), 10);
			from[1] = files.indexOf(move.substring(0, 1));
			to[0] = 8 - parseInt(move.substring(3, 4), 10);
			to[1] = files.indexOf(move.substring(2, 3));
			moveData.moves.push({ from, to });

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
			moveData.moves.push(
				this.findPiece(tarRow, tarCol, mustBeInRow, mustBeInCol, token)
			);

			// e.g. Rf3
		} else {
			const tarRow = 8 - parseInt(move.substring(1, 2), 10);
			const tarCol = files.indexOf(move.substring(0, 1));
			moveData.moves.push(this.findPiece(tarRow, tarCol, -1, -1, token));
		}

		return moveData;
	}

	/**
	 * Wrapper function for different piece search algorithms.
	 * @param {number} tarRow Target row for piece move.
	 * @param {number} tarCol Target column for piece move.
	 * @param {number} mustBeInRow Moving piece must be in this row. '-1' if unknown.
	 * @param {number} mustBeInCol Moving piece must be in this column. '-1' if unknown.
	 * @param {string} token Moving piece must be of this type, e.g 'R'.
	 * @returns {Object}
	 */
	findPiece(tarRow, tarCol, mustBeInRow, mustBeInCol, token) {
		let move;

		if (token === 'R') {
			move = this.findLine(
				tarRow,
				tarCol,
				mustBeInRow,
				mustBeInCol,
				token
			);
		} else if (token === 'B') {
			move = this.findDiag(
				tarRow,
				tarCol,
				mustBeInRow,
				mustBeInCol,
				token
			);
		} else if (token === 'Q' || token === 'K') {
			move = this.findDiag(
				tarRow,
				tarCol,
				mustBeInRow,
				mustBeInCol,
				token
			);
			if (move.from[0] === -1) {
				move = this.findLine(
					tarRow,
					tarCol,
					mustBeInRow,
					mustBeInCol,
					token
				);
			}
		} else if (token === 'N') {
			move = this.findKnight(
				tarRow,
				tarCol,
				mustBeInRow,
				mustBeInCol,
				token
			);
		}
		if (move.from[0] === -1) {
			console.log(
				`Error: no piece for move ${token} to (${tarRow},${tarCol}) found!`
			);
			this.board.printPosition();
		}

		return move;
	}

	/**
	 * Search algorithm to find a piece that can move diagonally.
	 * @param {number} tarRow Target row for piece move.
	 * @param {number} tarCol Target column for piece move.
	 * @param {number} mustBeInRow Moving piece must be in this row. '-1' if unknown.
	 * @param {number} mustBeInCol Moving piece must be in this column. '-1' if unknown.
	 * @param {string} token Moving piece must be of this type, e.g 'R'.
	 * @returns {Object}
	 */
	findDiag(tarRow, tarCol, mustBeInRow, mustBeInCol, token) {
		const color = this.activePlayer % 2 ? 'black' : 'white';

		const from = [];
		const to = [];
		from[0] = -1;
		from[1] = -1;
		to[0] = tarRow;
		to[1] = tarCol;

		for (let i = -1; i <= 1; i += 2) {
			let obstructed1 = false;
			let obstructed2 = false;
			for (let j = 1; j < 8; j += 1) {
				const row1 = to[0] + i * j;
				const col1 = to[1] + j;
				const row2 = to[0] - i * j;
				const col2 = to[1] - j;

				if (
					row1 >= 0 &&
					row1 < 8 &&
					col1 >= 0 &&
					col1 < 8 &&
					!obstructed1 &&
					this.board.tiles[row1][col1].piece !== null
				) {
					const { piece } = this.board.tiles[row1][col1];
					if (
						piece.name.includes(token) &&
						piece.color === color &&
						(mustBeInRow === -1 || row1 === mustBeInRow) &&
						(mustBeInCol === -1 || col1 === mustBeInCol)
					) {
						if (!this.checkCheck([row1, col1], [to[0], to[1]])) {
							from[0] = row1;
							from[1] = col1;
							return { from, to };
						}
					} else {
						obstructed1 = true;
					}
				}

				if (
					row2 >= 0 &&
					row2 < 8 &&
					col2 >= 0 &&
					col2 < 8 &&
					!obstructed2 &&
					this.board.tiles[row2][col2].piece !== null
				) {
					const { piece } = this.board.tiles[row2][col2];
					if (
						piece.name.includes(token) &&
						piece.color === color &&
						(mustBeInRow === -1 || row2 === mustBeInRow) &&
						(mustBeInCol === -1 || col2 === mustBeInCol)
					) {
						if (!this.checkCheck([row2, col2], [to[0], to[1]])) {
							from[0] = row2;
							from[1] = col2;
							return { from, to };
						}
					} else {
						obstructed2 = true;
					}
				}
			}
		}
		return { from, to };
	}

	/**
	 * Search algorithm to find a piece that can move vertically/horizontally.
	 * @param {number} tarRow Target row for piece move.
	 * @param {number} tarCol Target column for piece move.
	 * @param {number} mustBeInRow Moving piece must be in this row. '-1' if unknown.
	 * @param {number} mustBeInCol Moving piece must be in this column. '-1' if unknown.
	 * @param {string} token Moving piece must be of this type, e.g 'R'.
	 * @returns {Object}
	 */
	findLine(tarRow, tarCol, mustBeInRow, mustBeInCol, token) {
		const color = this.activePlayer % 2 ? 'black' : 'white';
		const from = [];
		const to = [];
		from[0] = -1;
		from[1] = -1;
		to[0] = tarRow;
		to[1] = tarCol;

		for (let i = -1; i <= 1; i += 2) {
			let obstructed1 = false;
			let obstructed2 = false;
			for (let j = 1; j < 8; j += 1) {
				const row1 = to[0];
				const col1 = to[1] - i * j;
				const row2 = to[0] - i * j;
				const col2 = to[1];

				if (
					row1 >= 0 &&
					row1 < 8 &&
					col1 >= 0 &&
					col1 < 8 &&
					!obstructed1 &&
					this.board.tiles[row1][col1].piece !== null
				) {
					const { piece } = this.board.tiles[row1][col1];
					if (
						piece.name.includes(token) &&
						piece.color === color &&
						(mustBeInRow === -1 || row1 === mustBeInRow) &&
						(mustBeInCol === -1 || col1 === mustBeInCol)
					) {
						if (!this.checkCheck([row1, col1], [to[0], to[1]])) {
							from[0] = row1;
							from[1] = col1;
							return { from, to };
						}
					} else {
						obstructed1 = true;
					}
				}
				if (
					row2 >= 0 &&
					row2 < 8 &&
					col2 >= 0 &&
					col2 < 8 &&
					!obstructed2 &&
					this.board.tiles[row2][col2].piece !== null
				) {
					const { piece } = this.board.tiles[row2][col2];
					if (
						piece.name.includes(token) &&
						piece.color === color &&
						(mustBeInRow === -1 || row2 === mustBeInRow) &&
						(mustBeInCol === -1 || col2 === mustBeInCol)
					) {
						if (!this.checkCheck([row2, col2], [to[0], to[1]])) {
							from[0] = row2;
							from[1] = col2;
							return { from, to };
						}
					} else {
						obstructed2 = true;
					}
				}
			}
		}
		return { from, to };
	}

	/**
	 * Search algorithm to find a matching knight.
	 * @param {number} tarRow Target row for piece move.
	 * @param {number} tarCol Target column for piece move.
	 * @param {number} mustBeInRow Moving piece must be in this row. '-1' if unknown.
	 * @param {number} mustBeInCol Moving piece must be in this column. '-1' if unknown.
	 * @param {string} token Moving piece must be of this type, e.g 'R'.
	 * @returns {Object}
	 */
	findKnight(tarRow, tarCol, mustBeInRow, mustBeInCol, token) {
		const color = this.activePlayer % 2 ? 'black' : 'white';
		const from = [];
		const to = [];
		from[0] = -1;
		from[1] = -1;
		to[0] = tarRow;
		to[1] = tarCol;

		for (let i = -2; i <= 2; i += 4) {
			for (let j = -1; j <= 1; j += 2) {
				const row1 = to[0] + i;
				const col1 = to[1] + j;
				const row2 = to[0] + j;
				const col2 = to[1] + i;
				if (
					row1 >= 0 &&
					row1 < 8 &&
					col1 >= 0 &&
					col1 < 8 &&
					this.board.tiles[row1][col1].piece !== null
				) {
					const { piece } = this.board.tiles[row1][col1];
					if (
						piece.name.includes(token) &&
						piece.color === color &&
						(mustBeInRow === -1 || row1 === mustBeInRow) &&
						(mustBeInCol === -1 || col1 === mustBeInCol)
					) {
						if (!this.checkCheck([row1, col1], [to[0], to[1]])) {
							from[0] = row1;
							from[1] = col1;
							return { from, to };
						}
					}
				}
				if (
					row2 >= 0 &&
					row2 < 8 &&
					col2 >= 0 &&
					col2 < 8 &&
					this.board.tiles[row2][col2].piece !== null
				) {
					const { piece } = this.board.tiles[row2][col2];
					if (
						piece.name.includes(token) &&
						piece.color === color &&
						(mustBeInRow === -1 || row2 === mustBeInRow) &&
						(mustBeInCol === -1 || col2 === mustBeInCol)
					) {
						if (!this.checkCheck([row2, col2], [to[0], to[1]])) {
							from[0] = row2;
							from[1] = col2;
							return { from, to };
						}
					}
				}
			}
		}
		return { from, to };
	}

	/**
	 * Checks if the input move would be resulting with the king being in check.
	 * @param {Number[]} from Coordinates of the source tile of the move that shall be checked.
	 *  @param {Number[]} to Coordinates of the target tile of the move that shall be checked.
	 * @returns {boolean} After the move, the king will be in check true/false.
	 */
	checkCheck(from, to) {
		const color = this.activePlayer % 2 ? 'black' : 'white';
		const opColor = this.activePlayer % 2 ? 'white' : 'black';
		const king = this.board.pieces[color === 'white' ? 28 : 4].pos;
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

		const srcTilePiece = this.board.tiles[from[0]][from[1]].piece;
		const tarTilePiece = this.board.tiles[to[0]][to[1]].piece;

		// premove and check if check
		this.board.tiles[from[0]][from[1]].piece = null;
		this.board.tiles[to[0]][to[1]].piece = srcTilePiece;

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
				this.board.tiles[row][col].piece !== null
			) {
				const { piece } = this.board.tiles[row][col];
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

		this.board.tiles[from[0]][from[1]].piece = srcTilePiece;
		this.board.tiles[to[0]][to[1]].piece = tarTilePiece;

		return isInCheck;
	}

	/**
	 * Returns the board coordinates for castling.
	 * @param {string} move The move to be parsed, e.g. 'O-O'.
	 * @returns {MoveData.moves}
	 */
	castle(move) {
		const row = this.activePlayer % 2 ? 0 : 7;
		const from1 = [];
		const from2 = [];
		const to1 = [];
		const to2 = [];
		const moveData = {
			moves: [],
			takes: false,
			promotes: null
		};

		// O-O
		if (move.length === 3) {
			from1[0] = row;
			from1[1] = 4;
			to1[0] = row;
			to1[1] = 6;
			from2[0] = row;
			from2[1] = 7;
			to2[0] = row;
			to2[1] = 5;

			// O-O-O
		} else {
			from1[0] = row;
			from1[1] = 4;
			to1[0] = row;
			to1[1] = 2;
			from2[0] = row;
			from2[1] = 0;
			to2[0] = row;
			to2[1] = 3;
		}
		moveData.moves.push({ from: from1, to: to1 });
		moveData.moves.push({ from: from2, to: to2 });
		return moveData;
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
