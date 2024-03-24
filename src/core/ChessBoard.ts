import type {
	ChessPiece,
	Action,
	MoveAction,
	CaptureAction,
	PromoteAction
} from '../interfaces/index.js';
import type { PieceToken, PlayerColor } from '../types/index.js';
import BitBoard from './BitBoard.js';

class PiecePositions {
	state: (string | null)[];

	constructor() {
		this.state = [
			'bRa',
			'bNb',
			'bBc',
			'bQd',
			'bKe',
			'bBf',
			'bNg',
			'bRh',
			'bPa',
			'bPb',
			'bPc',
			'bPd',
			'bPe',
			'bPf',
			'bPg',
			'bPh',
			...(Array(32).fill(null) as null[]),
			'wPa',
			'wPb',
			'wPc',
			'wPd',
			'wPe',
			'wPf',
			'wPg',
			'wPh',
			'wRa',
			'wNb',
			'wBc',
			'wQd',
			'wKe',
			'wBf',
			'wNg',
			'wRh'
		];
	}

	move(fromIdx: number, toIdx: number): void {
		this.state[toIdx] = this.state[fromIdx];
		this.state[fromIdx] = null;
	}

	capture(onIdx: number): void {
		this.state[onIdx] = null;
	}

	promote(piece: string, onIdx: number): void {
		this.state[onIdx] = piece;
	}
}

class ChessBoard {
	piecePositions: PiecePositions;
	bitboards: {
		common: BitBoard;
		w: {
			all: BitBoard;
			P: BitBoard;
			R: BitBoard;
			N: BitBoard;
			B: BitBoard;
			Q: BitBoard;
			K: BitBoard;
		};
		b: {
			all: BitBoard;
			P: BitBoard;
			R: BitBoard;
			N: BitBoard;
			B: BitBoard;
			Q: BitBoard;
			K: BitBoard;
		};
	};
	promoteCounter: number;

	constructor() {
		this.init();
	}

	private init() {
		this.piecePositions = new PiecePositions();
		this.bitboards = {
			common: new BitBoard(
				0b1111111111111111000000000000000000000000000000001111111111111111n
			),
			w: {
				all: new BitBoard(
					0b0000000000000000000000000000000000000000000000001111111111111111n
				),
				P: new BitBoard(
					0b0000000000000000000000000000000000000000000000001111111100000000n
				),
				R: new BitBoard(
					0b0000000000000000000000000000000000000000000000000000000010000001n
				),
				N: new BitBoard(
					0b0000000000000000000000000000000000000000000000000000000001000010n
				),
				B: new BitBoard(
					0b0000000000000000000000000000000000000000000000000000000000100100n
				),
				Q: new BitBoard(
					0b0000000000000000000000000000000000000000000000000000000000010000n
				),
				K: new BitBoard(
					0b0000000000000000000000000000000000000000000000000000000000001000n
				)
			},
			b: {
				all: new BitBoard(
					0b1111111111111111000000000000000000000000000000000000000000000000n
				),
				P: new BitBoard(
					0b0000000011111111000000000000000000000000000000000000000000000000n
				),
				R: new BitBoard(
					0b1000000100000000000000000000000000000000000000000000000000000000n
				),
				N: new BitBoard(
					0b0100001000000000000000000000000000000000000000000000000000000000n
				),
				B: new BitBoard(
					0b0010010000000000000000000000000000000000000000000000000000000000n
				),
				Q: new BitBoard(
					0b0001000000000000000000000000000000000000000000000000000000000000n
				),
				K: new BitBoard(
					0b0000100000000000000000000000000000000000000000000000000000000000n
				)
			}
		};
		this.promoteCounter = 0;
	}

	getPieceOnCoords(coords: number[]): ChessPiece | null {
		const piece =
			this.piecePositions.state[ChessBoard.coordsToIndex(coords)];
		if (!piece) return null;

		return {
			name: piece.slice(-2),
			color: piece.at(0) as PlayerColor
		};
	}

	// TODO: Optimize!
	getPiecePosition(player: PlayerColor, piece: string) {
		const fullPieceName = `${player}${piece}`;
		return ChessBoard.indexToCoords(
			this.piecePositions.state.indexOf(fullPieceName)
		);
	}

	getPiecesThatCanMoveToSquare(
		player: PlayerColor,
		token: PieceToken,
		target: number[]
	) {}

	// TODO: Optimize!
	getPositionsForToken(player: PlayerColor, token: PieceToken) {
		const positions: number[][] = [];
		for (const [idx, cell] of this.piecePositions.state.entries()) {
			if (cell?.startsWith(player) && cell?.includes(token))
				positions.push(ChessBoard.indexToCoords(idx));
		}
		return positions;
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
		const { from, to, piece, player } = action;

		const fromIdx = ChessBoard.coordsToIndex(from);
		const toIdx = ChessBoard.coordsToIndex(to);

		// update piece map
		this.piecePositions.move(fromIdx, toIdx);

		const token = piece.at(0) as PieceToken; // TODO: can also be pawntoken

		this.bitboards[player][token].invertBit(63 - fromIdx);
		this.bitboards[player][token].invertBit(63 - toIdx);
	}

	private capture(action: CaptureAction): void {
		const { on, player, takenPiece } = action;

		const onIdx = ChessBoard.coordsToIndex(on);

		// update piece map
		this.piecePositions.capture(onIdx);

		const token = takenPiece.at(0) as PieceToken; // TODO: can also be pawntoken
		this.bitboards[player][token].invertBit(63 - onIdx);
	}

	private promote(action: PromoteAction): void {
		const { on, to, player } = action;

		const onIdx = ChessBoard.coordsToIndex(on);

		const pieceName = `${player}${to}${this.promoteCounter++}`;
		this.piecePositions.promote(pieceName, onIdx);

		this.bitboards[player][to as PieceToken].invertBit(63 - onIdx);
	}

	private static coordsToIndex(coords: number[]) {
		return coords[0] * 8 + coords[1];
	}

	private static indexToCoords(index: number) {
		const row = Math.floor(index / 8);
		const col = index % 8;
		return [row, col];
	}
}

export default ChessBoard;
