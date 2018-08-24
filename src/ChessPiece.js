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
		this.name = piece; // piece type
		this.pos = pos; // current position in [row, col] notation
		this.defaultPos = pos; // starting position of this piece
		if (promoted) {
			this.color = this.defaultPos[0] <= 1 ? 'white' : 'black'; // color of piece: 0 white, 1 black
		} else {
			this.color = this.defaultPos[0] <= 1 ? 'black' : 'white'; // color of piece: 0 white, 1 black
		}

		this.history = []; // position history
		this.history.push(pos);

		/* 8x8 matrix that contains 3 informations for every tile
			0: counts how often this piece moved to the tile at these coordinates
			1: counts how often this piece was killed by the piece, that starts at these coordinates
			2: counts how often this piece killed a piece, that starts at these coordinates */
		this.dataMap = null;
		this.cntMoved = 0;
		this.cntWasKilled = 0;
		this.cntHasKilled = 0;
		this.initStats();

		this.alive = true; // piece alive?
		this.logHistory = false;

		this.maxHistory = 2000; // max length of history array
	}

	/**
	 * Resets this piece to its default position and denotes a new game in the move history tracker.
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
	 * @param {Number[]} pos Target row and column of the tile the piece shall move to.
	 */
	updatePosition(pos) {
		this.cntMoved += 1;
		this.pos = pos;
		if (this.logHistory && this.history.length < this.maxHistory) {
			this.history.push(pos);
		}
		this.dataMap[pos[0]][pos[1]][0] += 1;
	}

	/**
	 * Marks this piece as taken and updates the statistics of the piece it was taken by.
	 * @param {ChessPiece} killedBy Piece this piece was taken by.
	 */
	killPiece(killedBy) {
		this.alive = false;
		this.cntWasKilled += 1;

		// if killer is not promoted pawn...
		if (!(killedBy.name.length === 1 || this.name.length === 1)) {
			// update killedBy of this piece
			this.dataMap[killedBy.defaultPos[0]][
				killedBy.defaultPos[1]
			][1] += 1;
		}
	}

	killedPiece(killedPiece) {
		this.cntHasKilled += 1;

		// if killer is not promoted pawn...
		if (!(killedPiece.name.length === 1 || this.name.length === 1)) {
			// update killed stat of killer piece
			this.dataMap[killedPiece.defaultPos[0]][
				killedPiece.defaultPos[1]
			][2] += 1;
		}
	}

	/**
	 * Inits the statistics array of this piece.
	 */
	initStats() {
		this.cntMoved = 0;
		this.cntWasKilled = 0;
		this.cntHasKilled = 0;
		this.dataMap = new Array(8);
		for (let row = 0; row < 8; row += 1) {
			const currRow = new Array(8);
			for (let col = 0; col < 8; col += 1) {
				// [movedToTile, killedBy, killed]
				currRow[col] = [0, 0, 0];
			}
			this.dataMap[row] = currRow;
		}
	}
}

export default ChessPiece;
