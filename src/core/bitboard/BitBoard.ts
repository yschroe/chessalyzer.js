import Masks from './Masks.js';

export default class BitBoard {
	private state: bigint;
	constructor(value: bigint) {
		this.state = value;
	}

	getLegalPieces(
		targetIdx: number,
		pieceType: string,
		mustBeInRow: number | null,
		mustBeInCol: number | null
	) {
		// If there is only one piece left in mask, return it.
		if (this.isMultipleOfTwo()) return this;

		let mask = 0n;
		switch (pieceType) {
			case 'N':
				mask = Masks.KNIGHT[targetIdx];
				break;
			case 'Q':
				mask = Masks.QUEEN[targetIdx];
				break;
			case 'B':
				mask = Masks.BISHOP[targetIdx];
				break;
			case 'R':
				mask = Masks.ROOK[targetIdx];
				break;
		}

		if (mustBeInRow !== null) mask &= Masks.RANKS[7 - mustBeInRow];
		if (mustBeInCol !== null) mask &= Masks.FILES[7 - mustBeInCol];

		return new BitBoard(this.state & mask);
	}

	invertBit(bitIdx: number) {
		const mask = 1n << BigInt(bitIdx);
		this.state ^= mask;
	}

	isMultipleOfTwo() {
		return (this.state & -this.state) === this.state;
	}

	getHighestBit() {
		const i = (this.state.toString(16).length - 1) * 4;
		return i + 32 - Math.clz32(Number(this.state >> BigInt(i)));
		// return this.state.toString(2).length;
	}

	printBoard() {
		// Board
		for (let rank = 0; rank < 8; rank += 1) {
			const rankSlice =
				(this.state >> BigInt(8 * (7 - rank))) & 0b11111111n;
			process.stdout.write(
				`${rankSlice
					.toString(2)
					.padStart(8, '0')
					.replaceAll('0', '.')}\n`
			);
		}
		process.stdout.write('\n');
	}
}
