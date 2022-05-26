import { MoveData, ChessPiece } from '../interfaces';
import Utils from './Utils';

class PiecePositionTable {
	posMap: unknown;

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

	takes(player: string, piece: string): void {
		if (!piece.startsWith('P')) {
			delete this.posMap[player][piece.substring(0, 1)][piece];
		}
	}

	moves(player: string, piece: string, to: number[]): void {
		if (!piece.startsWith('P')) {
			this.posMap[player][piece.substring(0, 1)][piece] = to;
		}
	}

	promotes(player: string, piece: string, on: number[]): void {
		if (!piece.startsWith('P')) {
			this.posMap[player][piece.substring(0, 1)][piece] = on;
		}
	}
}

class ChessBoard {
	tiles: ChessPiece[][];
	defaultTiles: ChessPiece[][];
	pieces: PiecePositionTable;
	promoteCounter: number;

	constructor() {
		this.tiles = new Array(8);

		for (let row = 0; row < 8; row += 1) {
			const currRow: ChessPiece[] = new Array(8);
			for (let col = 0; col < 8; col += 1) {
				currRow[col] = Utils.getStartingPiece([row, col]);
			}
			this.tiles[row] = currRow;
		}

		this.defaultTiles = this.tiles.map((arr) => arr.slice());
		this.pieces = new PiecePositionTable();
		this.promoteCounter = 0;
	}

	move(moveData: MoveData) {
		// === castles ===
		if (moveData.castles) {
			this.castle(moveData.castles, moveData.player);

			// moves/takes
		} else if (moveData.move !== null) {
			const { from } = moveData.move;
			const { to } = moveData.move;

			// === takes ===
			if (moveData.takes) {
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
				this.tiles[to[0]][to[1]] = {
					name: pieceName,
					color: moveData.player
				};
				this.pieces.promotes(moveData.player, pieceName, to);
				this.promoteCounter += 1;
			}
		}
	}

	castle(move: string, player: string): void {
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

	reset(): void {
		this.tiles = this.defaultTiles.map((arr) => arr.slice());
		this.pieces = new PiecePositionTable();
		this.promoteCounter = 0;
	}

	/** Prints the current board position to the console. */
	printPosition(): void {
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
