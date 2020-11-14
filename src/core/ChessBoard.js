const pawnTemplate = ['Pa', 'Pb', 'Pc', 'Pd', 'Pe', 'Pf', 'Pg', 'Ph'];
const pieceTemplate = ['Ra', 'Nb', 'Bc', 'Qd', 'Ke', 'Bf', 'Ng', 'Rh'];

class PiecePositionTable {
	constructor() {
		this.posMap = {
			w: {
				R: {
					Ra: [7, 0],
					Rh: [7, 7]
				},
				N: {
					Nb: [7, 1],
					Ng: [7, 6]
				},
				B: {
					Bc: [7, 2],
					Bf: [7, 5]
				},
				Q: {
					Qd: [7, 3]
				},
				K: {
					Ke: [7, 4]
				}
			},
			b: {
				R: {
					Ra: [0, 0],
					Rh: [0, 7]
				},
				N: {
					Nb: [0, 1],
					Ng: [0, 6]
				},
				B: {
					Bc: [0, 2],
					Bf: [0, 5]
				},
				Q: {
					Qd: [0, 3]
				},
				K: {
					Ke: [0, 4]
				}
			}
		};
	}

	takes(player, piece) {
		if (!piece.includes('P')) {
			delete this.posMap[player][piece.substring(0, 1)][piece];
		}
	}

	moves(player, piece, to) {
		if (!piece.includes('P')) {
			this.posMap[player][piece.substring(0, 1)][piece] = to;
		}
	}

	promotes(player, piece, on) {
		if (!piece.includes('P')) {
			this.posMap[player][piece.substring(0, 1)][piece] = on;
		}
	}
}

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
		this.pieces = new PiecePositionTable();
		this.promoteCounter = 0;
	}

	move(moveData) {
		const { from } = moveData;
		const { to } = moveData;

		// === castles ===
		if (moveData.castles) {
			this.castle(moveData.castles, moveData.player);

			// moves/takes
		} else if (from[0] !== -1) {
			// === takes ===
			if (moveData.takes.pos) {
				// update piece map
				this.pieces.takes(
					moveData.player === 'w' ? 'b' : 'w',
					moveData.takes.piece
				);

				// update board
				this.tiles[moveData.takes.pos[0]][moveData.takes.pos[1]] = null;
			}
			// === moves ===
			// update piece map
			this.pieces.moves(moveData.player, moveData.piece, to);

			// update board
			this.tiles[to[0]][to[1]] = this.tiles[from[0]][from[1]];
			this.tiles[from[0]][from[1]] = null;

			if (moveData.promotesTo) {
				const pieceName = `${moveData.promotesTo}${this.promoteCounter}`;
				this.tiles[to[0]][to[1]] = new ChessPiece(
					pieceName,
					moveData.player
				);
				this.pieces.promotes(moveData.player, pieceName, to);
				this.promoteCounter += 1;
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
		// move king
		this.pieces.moves(player, 'Ke', [row, tarKingCol]);
		this.tiles[row][tarKingCol] = this.tiles[row][scrKingCol];
		this.tiles[row][scrKingCol] = null;

		// move rook
		this.pieces.moves(player, this.tiles[row][srcRookCol].name, [
			row,
			tarRookCol
		]);
		this.tiles[row][tarRookCol] = this.tiles[row][srcRookCol];
		this.tiles[row][srcRookCol] = null;
	}

	reset() {
		this.tiles = this.defaultTiles.map((arr) => arr.slice());
		this.pieces = new PiecePositionTable();
		this.promoteCounter = 0;
	}

	/** Prints the current board position to the console. */
	printPosition() {
		for (let row = 0; row < 8; row += 1) {
			for (let col = 0; col < 8; col += 1) {
				const piece = this.tiles[row][col];
				if (piece !== null) {
					process.stdout.write(`|${piece.color}${piece.name}|`);
				} else {
					process.stdout.write('|...|');
				}
			}
			process.stdout.write('\n');
		}
	}
}

export default ChessBoard;
