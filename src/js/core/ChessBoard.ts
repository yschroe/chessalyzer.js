import type {
	ChessPiece,
	Action,
	MoveAction,
	CaptureAction,
	PromoteAction
} from '../interfaces/index.js';
import type { PieceToken, PlayerColor } from '../types/index.js';
import BitBoard from './bitboard/BitBoard.js';

class PiecePositions {
	private state: (string | null)[];

	constructor() {
		// prettier-ignore
		this.state = [
			'wRh', 'wNg', 'wBf', 'wKe', 'wQd', 'wBc', 'wNb', 'wRa',
			'wPh', 'wPg', 'wPf', 'wPe', 'wPd', 'wPc', 'wPb', 'wPa',
			null,  null,  null,  null,  null,  null,  null,  null,
			null,  null,  null,  null,	null,  null,  null,  null,
			null,  null,  null,  null,  null,  null,  null,  null,  
			null,  null,  null,  null,  null,  null,  null,  null,
			'bPh', 'bPg', 'bPf', 'bPe', 'bPd', 'bPc', 'bPb', 'bPa',
			'bRh', 'bNg', 'bBf', 'bKe', 'bQd', 'bBc', 'bNb', 'bRa'
		]
	}

	get(idx: number) {
		return this.state[idx];
	}

	getAllForToken(player: PlayerColor, token: string) {
		const indexes: number[] = [];

		for (const [idx, cell] of this.state.entries()) {
			if (cell?.startsWith(player) && cell?.includes(token))
				indexes.push(idx);
		}
		return indexes;
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
		// common: BitBoard;
		w: {
			// all: BitBoard;
			P: BitBoard;
			R: BitBoard;
			N: BitBoard;
			B: BitBoard;
			Q: BitBoard;
			K: BitBoard;
		};
		b: {
			// all: BitBoard;
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
			// common: new BitBoard(0xffff00000000ffffn),
			w: {
				// all: new BitBoard(0xffffn),
				P: new BitBoard(0xff00n),
				R: new BitBoard(0x81n),
				N: new BitBoard(0x42n),
				B: new BitBoard(0x24n),
				Q: new BitBoard(0x10n),
				K: new BitBoard(0x8n)
			},
			b: {
				// all: new BitBoard(0xffff000000000000n),
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

	getPieceOnBitIdx(idx: number): ChessPiece | null {
		const piece = this.piecePositions.get(idx);
		if (!piece) return null;

		return {
			name: piece.slice(-2),
			color: piece.at(0) as PlayerColor
		};
	}

	getKingIdx(player: PlayerColor) {
		const bitboard = this.bitboards[player].K;
		const bit = bitboard.getHighestBitIdx();
		return bit;
	}

	getPiecesThatCanMoveToSquare(
		player: PlayerColor,
		token: PieceToken,
		targetIdx: number,
		mustBeInRow: number | null,
		mustBeInCol: number | null
	) {
		const bitboard = this.bitboards[player][token];
		const legalPieceBitboard = bitboard.getLegalPieces(
			targetIdx,
			token,
			mustBeInRow,
			mustBeInCol
		);

		if (legalPieceBitboard.isMultipleOfTwo()) {
			const bit = legalPieceBitboard.getHighestBitIdx();
			return bit;
		}

		console.log('No unique piece found!');
		console.log(token, targetIdx, mustBeInRow, mustBeInCol);
		this.printPosition();
		legalPieceBitboard.printBoard();

		return -1; // this.getPositionsForToken(player, token);
	}

	// TODO: Optimize!
	private getPositionsForToken(player: PlayerColor, token: PieceToken) {
		return this.piecePositions.getAllForToken(player, token);
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
				const piece = this.getPieceOnBitIdx(63 - row * 8 - col);
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
		const { fromIdx, toIdx, piece, player } = action;

		// update piece map
		this.piecePositions.move(fromIdx, toIdx);

		const token = piece.at(0) as PieceToken; // TODO: can also be pawntoken

		this.bitboards[player][token].invertBit(fromIdx);
		this.bitboards[player][token].invertBit(toIdx);
	}

	private capture(action: CaptureAction): void {
		const { onIdx, player, takenPiece } = action;

		// update piece map
		this.piecePositions.capture(onIdx);

		const token = takenPiece.at(0) as PieceToken; // TODO: can also be pawntoken
		const otherPlayer = player === 'w' ? 'b' : 'w';
		this.bitboards[otherPlayer][token].invertBit(onIdx);
	}

	private promote(action: PromoteAction): void {
		const { onIdx, to, player } = action;

		const pieceName = `${player}${to}${this.promoteCounter++}`;
		this.piecePositions.promote(pieceName, onIdx);

		this.bitboards[player][to as PieceToken].invertBit(onIdx);
	}

	// a8 = 0, h1 = 63
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