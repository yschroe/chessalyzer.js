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

		/**
		 * Object that contains the tracked statistics
		 * @member {Object}
		 */
		this.stats = {};

		/**
		 * Is this piece alive?
		 * @member {Object}
		 */

		this.initStats();

		// option to track the move history of each piece
		// currently unused, costs a lot of performance
		this.logHistory = false;
		this.history = []; // position history

		this.history.push(pos);
		this.maxHistory = 2000; // max length of history array
	}

	/**
	 * Resets this piece to its default position and denotes a new game in the move history tracker.
	 * @private
	 */
	reset() {
		if (this.logHistory && this.history.length < this.maxHistory) {
			this.history.push(null);
			this.history.push(this.defaultPos);
		}

		this.pos = this.defaultPos;
		this.alive = true;
	}

	/**
	 * Moves this piece to a new position and updates move statistics.
	 * @private
	 * @param {Number[]} pos Target row and column of the tile the piece shall move to.
	 */
	updatePosition(pos) {
		this.stats.cntMoved += 1;
		this.pos = pos;
		if (this.logHistory && this.history.length < this.maxHistory) {
			this.history.push(pos);
		}
		this.stats.at[pos[0]][pos[1]].movedTo += 1;
	}

	/**
	 * Marks this piece as taken and updates the statistics of the piece it was taken by.
	 * @private
	 * @param {ChessPiece} killedBy Piece this piece was taken by.
	 */
	killPiece(killedByPiece) {
		this.alive = false;
		this.stats.cntWasKilled += 1;

		// if killer is not promoted pawn...
		if (!(killedByPiece.name.length === 1 || this.name.length === 1)) {
			// update killedBy of this piece
			this.stats.at[killedByPiece.defaultPos[0]][
				killedByPiece.defaultPos[1]
			].killedBy += 1;
		}
	}

	killedPiece(killedPiece) {
		this.stats.cntHasKilled += 1;

		// if killer is not promoted pawn...
		if (!(killedPiece.name.length === 1 || this.name.length === 1)) {
			// update killed stat of killer piece
			this.stats.at[killedPiece.defaultPos[0]][
				killedPiece.defaultPos[1]
			].killed += 1;
		}
	}

	/**
	 * Inits the statistics array of this piece.
	 * @private
	 */
	initStats() {
		this.stats = { cntMoved: 0, cntWasKilled: 0, cntHasKilled: 0 };
		this.stats.at = new Array(8);
		for (let row = 0; row < 8; row += 1) {
			const currRow = new Array(8);
			for (let col = 0; col < 8; col += 1) {
				currRow[col] = { movedTo: 0, killedBy: 0, killed: 0 };
			}
			this.stats.at[row] = currRow;
		}
	}
}

export default ChessPiece;
