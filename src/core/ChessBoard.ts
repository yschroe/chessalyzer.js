import type {
	ChessPiece,
	Action,
	MoveAction,
	CastleAction,
	CaptureAction,
	PromoteAction
} from '../interfaces/index.js';
import type {
	Bishop,
	King,
	Knight,
	PieceToken,
	PlayerColor,
	Queen,
	Rook
} from '../types/index.js';
import Utils from './Utils.js';

interface PosMap {
	R: { [piece in Rook]: number[] };
	N: { [piece in Knight]: number[] };
	B: { [piece in Bishop]: number[] };
	Q: { [piece in Queen]: number[] };
	K: { [piece in King]: number[] };
}

class PiecePositionTable {
	posMap: { w: PosMap; b: PosMap };

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

	takes(player: PlayerColor, piece: string): void {
		if (!piece.startsWith('P'))
			delete this.posMap[player][piece.substring(0, 1) as PieceToken][
				piece
			];
	}

	moves(
		player: PlayerColor,
		piece: string,
		destinationSquare: number[]
	): void {
		if (!piece.startsWith('P'))
			this.posMap[player][piece.substring(0, 1) as PieceToken][piece] =
				destinationSquare;
	}

	promotes(player: PlayerColor, piece: string, onSquare: number[]): void {
		if (!piece.startsWith('P'))
			this.posMap[player][piece.substring(0, 1) as PieceToken][piece] =
				onSquare;
	}
}

class ChessBoard {
	tiles: (ChessPiece | null)[][];
	defaultTiles: (ChessPiece | null)[][];
	pieces: PiecePositionTable;
	promoteCounter: number;

	constructor() {
		this.defaultTiles = [];
		for (let row = 0; row < 8; row += 1) {
			const currRow: (ChessPiece | null)[] = [];
			for (let col = 0; col < 8; col += 1) {
				currRow.push(Utils.getStartingPiece([row, col]));
			}
			this.defaultTiles.push(currRow);
		}

		this.tiles = this.defaultTiles.map((arr) => arr.slice());
		this.pieces = new PiecePositionTable();
		this.promoteCounter = 0;
	}

	applyActions(actions: Action[]) {
		for (const action of actions) {
			switch (action.type) {
				case 'move':
					this.move(action);
					break;
				case 'capture':
					this.capture(action);
					break;
				case 'castle':
					this.castle(action);
					break;
				case 'promote':
					this.promote(action);
					break;
			}
		}
	}

	private move(action: MoveAction) {
		const { from, to } = action;

		// update piece map
		this.pieces.moves(action.player, action.piece, to);

		// update board
		this.tiles[to[0]][to[1]] = this.tiles[from[0]][from[1]];
		this.tiles[from[0]][from[1]] = null;
	}

	private capture(action: CaptureAction) {
		// update piece map
		this.pieces.takes(action.player === 'w' ? 'b' : 'w', action.takenPiece);

		// update board
		this.tiles[action.on[0]][action.on[1]] = null;
	}

	private promote(action: PromoteAction) {
		const newPieceName = `${action.to}${this.promoteCounter}`;
		this.tiles[action.on[0]][action.on[1]] = {
			name: newPieceName,
			color: action.player
		};
		this.pieces.promotes(action.player, newPieceName, action.on);
		this.promoteCounter += 1;
	}

	private castle(action: CastleAction): void {
		const { san, player } = action;
		const row = player === 'w' ? 7 : 0;
		const scrKingCol = 4;
		let tarKingCol = 6;
		let srcRookCol = 7;
		let tarRookCol = 5;

		if (san === 'O-O-O') {
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

	getPieceOnCoords(coords: number[]): ChessPiece | null {
		return this.tiles[coords[0]][coords[1]];
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
