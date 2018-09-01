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
		 * Object that contains the tracked statistics
		 * @member {Object}
		 */
		this.stats = {};

		this.initStats();
	}

	/**
	 * Places a piece on this tile. Should only be called at board init.
	 * @private
	 * @param {ChessPiece} piece The piece that is on this square by default.
	 */
	initPiece(piece) {
		this.piece = piece;
		this.defaultPiece = piece;
	}

	/**
	 * Sets the currently active piece of this square to the default piece.
	 * @private
	 */
	resetPiece() {
		this.piece = this.defaultPiece;
	}

	/**
	 * Updates the statistics of this tile.
	 * @private
	 */
	updateOccupationStats() {
		// this.stats.cntHasPiece[this.piece.color] is slow for some reason, so use if
		if (this.piece.color === 'white') {
			this.stats.cntHasPiece.white += 1;
		} else {
			this.stats.cntHasPiece.black += 1;
		}

		// only non-promoted pieces are counted
		if (this.piece.name.length !== 1) {
			this.stats.at[this.piece.defaultPos[0]][
				this.piece.defaultPos[1]
			].wasOnTile += 1;
		}
	}

	updateDeadCount() {
		this.stats.cntTakenPieces += 1;
	}

	/**
	 * Inits the statistics array. Is called by the constructor.
	 * @private
	 */
	initStats() {
		this.stats.cntHasPiece = { white: 0, black: 0 };
		this.stats.cntTakenPieces = 0;

		this.stats.at = new Array(8);
		for (let row = 0; row < 8; row += 1) {
			const currRow = new Array(8);
			for (let col = 0; col < 8; col += 1) {
				currRow[col] = { wasOnTile: 0 };
			}
			this.stats.at[row] = currRow;
		}
	}
}

export default ChessTile;
