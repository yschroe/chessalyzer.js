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
}

export default ChessTile;
