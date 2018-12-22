const pawnTemplate = ['Pa', 'Pb', 'Pc', 'Pd', 'Pe', 'Pf', 'Pg', 'Ph'];
const pieceTemplate = ['Ra', 'Nb', 'Bc', 'Qd', 'Ke', 'Bf', 'Ng', 'Rh'];

class ChessPiece {
	constructor(name, color) {
		this.name = name;
		this.color = color;
	}
}

class ChessBoard {
	constructor() {
		this.tiles = new Array(8);
		for (let row = 0; row < 8; row += 1) {
			const currRow = new Array(8);
			for (let col = 0; col < 8; col += 1) {
				currRow[col] = null;
				const color = row === 0 || row === 1 ? 'b' : 'w';

				// init pieces
				if (row === 0 || row === 7) {
					currRow[col] = new ChessPiece(pieceTemplate[col], color);
				} else if (row === 1 || row === 6) {
					currRow[col] = new ChessPiece(pawnTemplate[col], color);
				}
			}
			this.tiles[row] = currRow;
		}
		this.defaultTiles = this.tiles.map((arr) => arr.slice());
		this.kingPos = { w: [7, 4], b: [0, 4] };
	}

	move(moveData) {
		const { from } = moveData;
		const { to } = moveData;

		// castles
		if (moveData.castles !== '') {
			this.castle(moveData.castles, moveData.player);

			// moves/takes
		} else if (from[0] !== -1) {
			// takes
			if ('pos' in moveData.takes) {
				this.tiles[moveData.takes.pos[0]][moveData.takes.pos[1]] = null;
			}
			// moves
			this.tiles[to[0]][to[1]] = this.tiles[from[0]][from[1]];
			this.tiles[from[0]][from[1]] = null;

			if (moveData.promotesTo !== '') {
				this.tiles[to[0]][to[1]] = new ChessPiece(
					moveData.promotesTo,
					moveData.player
				);
			}

			if (moveData.san.substring(0, 1) === 'K') {
				this.kingPos[moveData.player] = to;
			}
		}
	}

	castle(move, player) {
		const row = player === 'w' ? 7 : 0;
		const scrKingCol = 4;
		let tarKingCol = 6;
		let srcRookCol = 7;
		let tarRookCol = 5;

		if (move === 'O-O-O') {
			tarKingCol = 2;
			tarRookCol = 3;
			srcRookCol = 0;
		}
		this.tiles[row][tarKingCol] = this.tiles[row][scrKingCol];
		this.tiles[row][tarRookCol] = this.tiles[row][srcRookCol];
		this.tiles[row][scrKingCol] = null;
		this.tiles[row][srcRookCol] = null;
		this.kingPos[player] = [row, tarKingCol];
	}

	reset() {
		this.tiles = this.defaultTiles.map((arr) => arr.slice());
		this.kingPos = { w: [7, 4], b: [0, 4] };
	}

	/** Prints the current board position to the console. */
	printPosition() {
		for (let row = 0; row < 8; row += 1) {
			const rowArray = [];
			for (let col = 0; col < 8; col += 1) {
				const piece = this.tiles[row][col];
				if (piece !== null) {
					rowArray.push(piece.color + piece.name);
				} else {
					rowArray.push('...');
				}
			}
			console.log(rowArray);
		}
	}
}

export default ChessBoard;
