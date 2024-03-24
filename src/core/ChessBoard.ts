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
			common: new BitBoard(0xffff00000000ffffn),
			w: {
				all: new BitBoard(0xffffn),
				P: new BitBoard(0xff00n),
				R: new BitBoard(0x81n),
				N: new BitBoard(0x42n),
				B: new BitBoard(0x24n),
				Q: new BitBoard(0x10n),
				K: new BitBoard(0x8n)
			},
			b: {
				all: new BitBoard(0xffff000000000000n),
				P: new BitBoard(0x00ff000000000000n),
				R: new BitBoard(0x8100000000000000n),
				N: new BitBoard(0x4200000000000000n),
				B: new BitBoard(0x2400000000000000n),
				Q: new BitBoard(0x1000000000000000n),
				K: new BitBoard(0x0800000000000000n)
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

	getKing(player: PlayerColor) {
		const bitboard = this.bitboards[player].K;
		const bits = bitboard.state.toString(2).length - 1;
		return ChessBoard.indexToCoords(63 - bits);
	}

	getPiecesThatCanMoveToSquare(
		player: PlayerColor,
		token: PieceToken,
		target: number[],
		mustBeInRow: number | null,
		mustBeInCol: number | null
	) {
		const bitboard = this.bitboards[player][token];
		const abc = bitboard.getLegalPieces(
			63 - ChessBoard.coordsToIndex(target),
			token,
			mustBeInRow,
			mustBeInCol
		);
		const isMultOf2 = (abc & -abc) === abc;

		if (Number(abc) > 0 && isMultOf2) {
			const bits = abc.toString(2).length - 1;
			return [ChessBoard.indexToCoords(63 - bits)];
		}

		console.log('No unique piece found!');
		console.log(token, target, mustBeInRow, mustBeInCol);
		this.printPosition();
		new BitBoard(abc).printBoard();

		return this.getPositionsForToken(player, token);
	}

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
		const otherPlayer = player === 'w' ? 'b' : 'w';
		this.bitboards[otherPlayer][token].invertBit(63 - onIdx);
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
