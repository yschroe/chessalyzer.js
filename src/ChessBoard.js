import ChessTile from './ChessTile';
import ChessPiece from './ChessPiece';

const pawnTemplate = ['Pa', 'Pb', 'Pc', 'Pd', 'Pe', 'Pf', 'Pg', 'Ph'];
const pieceTemplate = ['Ra', 'Nb', 'Bc', 'Qd', 'Ke', 'Bf', 'Ng', 'Rh'];

/** Class that contains the board status and tracks statistics. */
class ChessBoard {
	/** Creates a new 8x8 Chessboard out of 64 {@link ChessTile}s and 32 {@link ChessPiece}s */
	constructor() {
		/**
		 * Tracks number of moves and games: { cntMoves, cntGames }
		 * @member {Object}
		 */
		this.data = {
			cntMoves: 0,
			cntGames: 0
		};

		/**
		 * Contains all pieces on the board
		 * @member {ChessPiece[]}
		 */
		this.pieces = [];

		/**
		 * 8x8 array of {@link ChessTile}s
		 * @member {Array[]}
		 */
		this.tiles = new Array(8);
		for (let row = 0; row < 8; row += 1) {
			const currRow = new Array(8);
			for (let col = 0; col < 8; col += 1) {
				currRow[col] = new ChessTile();

				// init pieces
				if (row === 0 || row === 7) {
					this.pieces.push(
						new ChessPiece(pieceTemplate[col], [row, col])
					);
					currRow[col].initPiece(this.pieces[this.pieces.length - 1]);
				} else if (row === 1 || row === 6) {
					this.pieces.push(
						new ChessPiece(pawnTemplate[col], [row, col])
					);
					currRow[col].initPiece(this.pieces[this.pieces.length - 1]);
				}
			}
			this.tiles[row] = currRow;
		}
	}

	/**
	 * Moves a piece from source to target. Automatically handles the events 'move',
	 *  'take', 'en passant', 'castle' and 'promote'.
	 * Use this function instead of {@link ChessBoard.processMove()} to input a move to the board!
	 * @param {Object} moveData
	 * @param {Object[]} moveData.moves - An array containing up to 2 moves in the
	 *  syntax {from: [], to: []}
	 * @param {Boolean} moveData.takes - True if the move takes a piece
	 * @param {String} moveData.promotes - Type of promoted piece in case of pawn promotion, else null
	 */
	move(moveData) {
		if (moveData !== null) {
			this.data.cntMoves += 1;

			const { moves } = moveData;
			const { takes } = moveData;
			const { promotes } = moveData;

			// move
			if (moves.length === 1) {
				const move = moves[0];

				switch (takes) {
					case true:
						// en passant
						if (this.tiles[move.to[0]][move.to[1]].piece === null) {
							if (
								this.tiles[move.from[0]][move.from[1]].piece
									.color === 'white'
							) {
								this.tiles[move.to[0] + 1][
									move.to[1]
								].piece.alive = false;
								this.tiles[move.to[0] + 1][
									move.to[1]
								].piece = null;
							} else {
								this.tiles[move.to[0] - 1][
									move.to[1]
								].piece.alive = false;
								this.tiles[move.to[0] - 1][
									move.to[1]
								].piece = null;
							}
						}
						break;
					case false:
						break;
					default:
						break;
				}
				this.processMove(move);

				if (promotes !== null) {
					this.promotePiece(move.to, promotes);
				}
				// castle
			} else {
				this.processMove(moves[0]);
				this.processMove(moves[1]);
			}

			this.updateTileStats();
		}
	}

	/**
	 * Handles the move commanded by {@link ChessBoard#move}. Don't call this function directly,
	 *  use {@link ChessBoard#move} to input a move!
	 * @private
	 * @param {Object} move
	 * @param {Number[]} move.from - Coordinates of start tile
	 * @param {Number[]} move.to - Coordinates of target tile
	 */
	processMove(move) {
		// takes?
		const { from } = move;
		const { to } = move;
		const toPiece = this.tiles[to[0]][to[1]].piece;
		const fromPiece = this.tiles[from[0]][from[1]].piece;

		if (toPiece !== null) {
			toPiece.killPiece(fromPiece);
			fromPiece.killedPiece(toPiece);
		}
		this.tiles[to[0]][to[1]].piece = fromPiece;
		this.tiles[to[0]][to[1]].piece.updatePosition(to);
		this.tiles[from[0]][from[1]].piece = null;
	}

	/** Resets the board to the default state: removes promoted pieces and puts the standard
	 *  pieces back to their starting positions.
	 *
	 *  Does not reset the stats recorded. If you wish to reset the stats,
	 *  call {@link ChessBoard#resetStats}. */
	reset() {
		this.data.cntGames += 1;
		// reset the pieces to default
		for (let i = 0; i < this.pieces.length; i += 1) {
			this.pieces[i].reset();
		}

		// remove promoted pieces
		this.pieces = this.pieces.slice(0, 32);

		// reset the tiles
		for (let row = 0; row < 8; row += 1) {
			for (let col = 0; col < 8; col += 1) {
				this.tiles[row][col].resetPiece();
			}
		}
	}

	/** Resets the stats recorded. */
	resetStats() {
		// reset the tiles
		for (let row = 0; row < 8; row += 1) {
			for (let col = 0; col < 8; col += 1) {
				this.tiles[row][col].initStats();
			}
		}

		// reset the pieces to default
		for (let i = 0; i < this.pieces.length; i += 1) {
			this.pieces[i].initStats();
		}

		this.data.cntMoves = 0;
		this.data.cntGames = 0;
	}

	/**
	 * Promotes a pawn to a piece.
	 * @param {Number[]} coords An array containing the row and column of the pawn to be promoted.
	 * @param {String} pieceType Target piece type in SAN notation ('N', 'B', 'Q', 'R').
	 */
	promotePiece(coords, pieceType) {
		// change alive directly instead of killPiece to not update stats
		this.tiles[coords[0]][coords[1]].piece.alive = false;
		this.tiles[coords[0]][coords[1]].piece = null;

		this.pieces.push(
			new ChessPiece(pieceType, [coords[0], coords[1]], true)
		);
		this.tiles[coords[0]][coords[1]].piece = this.pieces[
			this.pieces.length - 1
		];
	}

	/** Prints the current board position to the console. */
	printPosition() {
		for (let row = 0; row < 8; row += 1) {
			const rowArray = [];
			for (let col = 0; col < 8; col += 1) {
				const { piece } = this.tiles[row][col];
				if (piece !== null) {
					rowArray.push(piece.name);
				} else {
					rowArray.push('..');
				}
			}
			console.log(rowArray);
		}
	}

	/** Is called after each {@link ChessBoard#move} to record the stats for the ChessTiles.
	 * Only every tile, that has a piece on it, is updated.
	 */
	updateTileStats() {
		for (let i = 0; i < 32; i += 1) {
			if (this.pieces[i].alive) {
				this.tiles[this.pieces[i].pos[0]][
					this.pieces[i].pos[1]
				].updateStats();
			}
		}
	}
}

export default ChessBoard;
