/**
 * Class that represents a chess piece and tracks statistics.
 */
class ChessPiece {
	/**
	 * Creates a new ChessPiece.
	 * @param {String} piece The name of the piece, e.g. 'Pd' for a D pawn.
	 * @param {Number[]} pos Row and column the piece is on at start.
	 * @param {Boolean} [promoted=false] Denotes if this piece is created by pawn promotion.
	 */
	constructor(piece, pos, promoted = false) {
		/**
		 * Name of the piece, e.g 'Pb' for the b pawn
		 * @member {String}
		 */
		this.name = piece; // piece type

		/**
		 * Current position of this piece: [row,col], with [0,0] being the top left square
		 * @member {Number[]}
		 */
		this.pos = pos; // current position in [row, col] notation

		/**
		 * Starting position of this piece: [row,col], with [0,0] being the top left square
		 * @member {Number[]}
		 */
		this.defaultPos = pos; // starting position of this piece

		/**
		 * Color of this piece: 'black' or 'white'
		 * @member {String}
		 */
		this.color = '';
		if (promoted) {
			this.color = this.defaultPos[0] <= 1 ? 'white' : 'black'; // color of piece: 0 white, 1 black
		} else {
			this.color = this.defaultPos[0] <= 1 ? 'black' : 'white'; // color of piece: 0 white, 1 black
		}

		this.alive = true; // piece alive?
	}

	/**
	 * Resets this piece to its default position and denotes a new game in the move history tracker.
	 * @private
	 */
	reset() {
		this.pos = this.defaultPos;
		this.alive = true;
	}

	/**
	 * Moves this piece to a new position and updates move statistics.
	 * @private
	 * @param {Number[]} pos Target row and column of the tile the piece shall move to.
	 */
	updatePosition(pos) {
		this.pos = pos;
	}

	/**
	 * Marks this piece as taken and updates the statistics of the piece it was taken by.
	 * @private
	 * @param {ChessPiece} killedBy Piece this piece was taken by.
	 */
	killPiece() {
		this.alive = false;
	}
}

export default ChessPiece;
