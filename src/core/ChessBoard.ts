import type {
	ChessPiece,
	Action,
	MoveAction,
	CaptureAction,
	PromoteAction
} from '../interfaces/index.js';
import type { PieceToken, PlayerColor } from '../types/index.js';
import Utils from './Utils.js';

class PiecePositions {
	R: Map<string, number[]>;
	N: Map<string, number[]>;
	B: Map<string, number[]>;
	Q: Map<string, number[]>;
	K: Map<string, number[]>;

	constructor(player: PlayerColor) {
		const row = player === 'w' ? 7 : 0;

		this.R = new Map([
			['Ra', [row, 0]],
			['Rh', [row, 7]]
		]);

		this.N = new Map([
			['Nb', [row, 1]],
			['Ng', [row, 6]]
		]);

		this.B = new Map([
			['Bc', [row, 2]],
			['Bf', [row, 5]]
		]);

		this.Q = new Map([['Qd', [row, 3]]]);
		this.K = new Map([['Ke', [row, 4]]]);
	}

	capture(piece: string): void {
		const token = piece.at(0) as PieceToken;
		this[token]?.delete(piece);
	}

	move(piece: string, destinationSquare: number[]): void {
		const token = piece.at(0) as PieceToken;
		this[token]?.set(piece, destinationSquare);
	}

	promote(piece: string, onSquare: number[]): void {
		const token = piece.at(0) as PieceToken;
		this[token]?.set(piece, onSquare);
	}
}

class ChessBoard {
	tiles: (ChessPiece | null)[][];
	private defaultTiles: (ChessPiece | null)[][];
	private pieces: { w: PiecePositions; b: PiecePositions };
	private promoteCounter: number;

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
		this.pieces = {
			w: new PiecePositions('w'),
			b: new PiecePositions('b')
		};
		this.promoteCounter = 0;
	}

	getPieceOnCoords(coords: number[]): ChessPiece | null {
		return this.tiles[coords[0]][coords[1]];
	}

	getPiecePosition(player: PlayerColor, piece: string): number[] | undefined {
		const token = piece.at(0) as PieceToken;
		return this.pieces[player][token].get(piece);
	}

	getPositionsForToken(player: PlayerColor, token: PieceToken) {
		return [...this.pieces[player][token].values()];
	}

	applyActions(actions: Action[]): void {
		for (const action of actions) {
			switch (action.type) {
				case 'move':
					this.move(action);
					break;
				case 'capture':
					this.capture(action);
					break;
				case 'promote':
					this.promote(action);
					break;
			}
		}
	}

	reset(): void {
		this.tiles = this.defaultTiles.map((arr) => [...arr]);
		this.pieces = {
			w: new PiecePositions('w'),
			b: new PiecePositions('b')
		};
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

	private move(action: MoveAction): void {
		const { from, to, player } = action;

		// update piece map
		this.pieces[player].move(action.piece, to);

		// update board
		this.tiles[to[0]][to[1]] = this.tiles[from[0]][from[1]];
		this.tiles[from[0]][from[1]] = null;
	}

	private capture(action: CaptureAction): void {
		// update piece map
		this.pieces[action.player === 'w' ? 'b' : 'w'].capture(
			action.takenPiece
		);

		// update board
		this.tiles[action.on[0]][action.on[1]] = null;
	}

	private promote(action: PromoteAction): void {
		const newPieceName = `${action.to}${this.promoteCounter}`;
		this.tiles[action.on[0]][action.on[1]] = {
			name: newPieceName,
			color: action.player
		};
		this.pieces[action.player].promote(newPieceName, action.on);
		this.promoteCounter += 1;
	}
}

export default ChessBoard;
