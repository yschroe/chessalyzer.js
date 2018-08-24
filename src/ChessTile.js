/** Class that represents a single Tile. Tracks statistics for itself. */
class ChessTile {
	/** Creates a new Tile. */
	constructor() {
		/**
		 * Piece that is currently on this tile.
		 * @member {ChessPiece}
		 */
		this.piece = null;

		/**
		 * Piece that is on this tile at start of game.
		 * @member {ChessPiece}
		 */
		this.defaultPiece = null;

		/* 8x8 matrix that contains 2 informations for every tile
			0: counts how often the piece, that starts at these coordinates, was on this tile
			1: ? */
		this.dataMap = null;
		this.initStats();
		// counts amount of half moves, this tile has a piece on it [white, black]
		this.cntHasPiece = [0, 0];
	}

	/**
	 * Places a piece on this tile. Should only be called at board init.
	 * @param {ChessPiece} piece The piece that is on this square by default.
	 */
	initPiece(piece) {
		this.piece = piece;
		this.defaultPiece = piece;
	}

	/**
	 * Sets the currently active piece of this square to the default piece.
	 */
	resetPiece() {
		this.piece = this.defaultPiece;
	}

	/**
	 * Updates the statistics of this tile.
	 */
	updateStats() {
		const index = this.piece.color === 'white' ? 0 : 1;
		this.cntHasPiece[index] += 1;
		// only non-promoted pieces are counted
		if (this.piece.name.length !== 1) {
			this.dataMap[this.piece.defaultPos[0]][
				this.piece.defaultPos[1]
			][0] += 1;
		}
	}

	/**
	 * Inits the statistics array. Is called by the constructor.
	 */
	initStats() {
		this.cntHasPiece = [0, 0];
		this.dataMap = new Array(8);
		for (let row = 0; row < 8; row += 1) {
			const currRow = new Array(8);
			for (let col = 0; col < 8; col += 1) {
				currRow[col] = [0, 0];
			}
			this.dataMap[row] = currRow;
		}
	}
}

export default ChessTile;
