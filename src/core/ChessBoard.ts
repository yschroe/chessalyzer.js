import type {
	ChessPiece,
	Action,
	MoveAction,
	CaptureAction,
	PromoteAction
} from '../interfaces/index';
import type { PieceToken, PlayerColor } from '../types/index';

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
	// prettier-ignore
	private static defaultTiles = new Uint8Array([
		129, 	130, 	131, 	132, 	133, 	134, 	135, 	136,
		137, 	138, 	139, 	140, 	141, 	142, 	143, 	144, 
		0, 		0, 		0, 		0, 		0, 		0, 		0, 		0, 
		0, 		0, 		0, 		0, 		0, 		0, 		0, 		0, 
		0, 		0, 		0, 		0, 		0, 		0, 		0, 		0, 
		0, 		0, 		0, 		0, 		0, 		0, 		0, 		0, 
		9, 		10, 	11,		12, 	13, 	14, 	15, 	16, 
		1, 		2, 		3, 		4, 		5, 		6, 		7, 		8
	]);
	private static pieceLookupList = [
		null,
		'Ra',
		'Nb',
		'Bc',
		'Qd',
		'Ke',
		'Bf',
		'Ng',
		'Rh',
		'Pa',
		'Pb',
		'Pc',
		'Pd',
		'Pe',
		'Pf',
		'Pg',
		'Ph'
	];
	private tiles: Uint8Array;
	private pieces: { w: PiecePositions; b: PiecePositions };
	private promotedPieces: {
		w: string[];
		b: string[];
	};

	constructor() {
		this.init();
	}

	private init() {
		this.tiles = ChessBoard.defaultTiles.slice();
		this.pieces = {
			w: new PiecePositions('w'),
			b: new PiecePositions('b')
		};
		this.promotedPieces = {
			w: [],
			b: []
		};
	}

	getPieceOnCoords(coords: number[]): ChessPiece | null {
		const pieceNumber = this.tiles[ChessBoard.coordsToIndex(coords)];
		if (pieceNumber === 0) return null;

		// Get first bit -> 1: black, 0: white
		const color = pieceNumber & 0b10000000 ? 'b' : 'w';
		const pieceIdx = pieceNumber & 0b01111111;

		const pieceName =
			ChessBoard.pieceLookupList.at(pieceIdx) ??
			this.promotedPieces[color].at(
				pieceIdx - ChessBoard.pieceLookupList.length - 1
			);

		return {
			name: pieceName,
			color
		};
	}

	getPiecePosition(player: PlayerColor, piece: string) {
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
		this.init();
	}

	/** Prints the current board position to the console. */
	printPosition(): void {
		console.log(this.tiles);
		for (let row = 0; row < 8; row += 1) {
			// Rank
			process.stdout.write(`${8 - row} `);

			// Board
			for (let col = 0; col < 8; col += 1) {
				const piece = this.getPieceOnCoords([row, col]);
				if (piece !== null) {
					process.stdout.write(`|${piece.color}${piece.name}|`);
				} else {
					process.stdout.write('|...|');
				}
			}
			process.stdout.write('\n');
		}

		// Files
		process.stdout.write(`    a    b    c    d    e    f    g    h\n`);
	}

	private move(action: MoveAction): void {
		const { from, to, player, piece } = action;

		// update piece map
		this.pieces[player].move(piece, to);

		const fromIdx = ChessBoard.coordsToIndex(from);
		const toIdx = ChessBoard.coordsToIndex(to);

		// update board
		this.tiles[toIdx] = this.tiles[fromIdx];
		this.tiles[fromIdx] = 0;
	}

	private capture(action: CaptureAction): void {
		const { on, player, takenPiece } = action;

		// update piece map
		this.pieces[player === 'w' ? 'b' : 'w'].capture(takenPiece);

		// update board
		const captureIdx = ChessBoard.coordsToIndex(on);
		this.tiles[captureIdx] = 0;
	}

	private promote(action: PromoteAction): void {
		const { on, to, player } = action;

		const pieceNumber =
			(player === 'w' ? 0b00000000 : 0b10000000) |
			(this.promotedPieces[player].length +
				ChessBoard.pieceLookupList.length +
				1);

		const piecename = `${to}${pieceNumber}`;

		this.promotedPieces[player].push(piecename);

		this.tiles[ChessBoard.coordsToIndex(on)] = pieceNumber;
		this.pieces[player].promote(piecename, on);
	}

	private static coordsToIndex(coords: number[]) {
		return coords[0] * 8 + coords[1];
	}
}

export default ChessBoard;
