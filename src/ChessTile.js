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

		/**
		 * 8x8 array that contains data for this tile. {wasOnTile: Number}
		 * @member {Array}
		 */
		this.stats = null;

		/**
		 * Counts how often a piece was on the tile { white, black }
		 * @member {Object}
		 */
		this.cntHasPiece = { white: 0, black: 0 };

		this.initStats();
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
		// this.cntHasPiece[this.piece.color] is slow for some reason, so use if
		if (this.piece.color === 'white') {
			this.cntHasPiece.white += 1;
		} else {
			this.cntHasPiece.black += 1;
		}

		// only non-promoted pieces are counted
		if (this.piece.name.length !== 1) {
			this.stats[this.piece.defaultPos[0]][
				this.piece.defaultPos[1]
			].wasOnTile += 1;
		}
	}

	/**
	 * Inits the statistics array. Is called by the constructor.
	 */
	initStats() {
		this.cntHasPiece = { white: 0, black: 0 };
		this.stats = new Array(8);
		for (let row = 0; row < 8; row += 1) {
			const currRow = new Array(8);
			for (let col = 0; col < 8; col += 1) {
				currRow[col] = { wasOnTile: 0 };
			}
			this.stats[row] = currRow;
		}
	}
}

export default ChessTile;
