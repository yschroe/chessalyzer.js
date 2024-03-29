import Masks from './Masks.js';

const testersCoeff: number[] = [];
const testersBigCoeff: bigint[] = [];
const testers: bigint[] = [];
let testersN = 0;

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

	getHighestBitIdx() {
		// https://stackoverflow.com/a/76616288
		// VAR 1
		const x = this.state;
		let k = 0;
		while (true) {
			if (testersN === k) {
				testersCoeff.push(32 << testersN);
				testersBigCoeff.push(BigInt(testersCoeff[testersN]));
				testers.push(1n << testersBigCoeff[testersN]);
				testersN++;
			}
			if (x < testers[k]) break;
			k++;
		}

		if (!k) return 32 - Math.clz32(Number(x)) - 1;

		// determine length by bisection
		k--;
		let i = testersCoeff[k];
		let a = x >> testersBigCoeff[k];
		while (k--) {
			const b = a >> testersBigCoeff[k];
			if (b) (i += testersCoeff[k]), (a = b);
		}

		return i + 32 - Math.clz32(Number(a)) - 1;

		// VAR 2
		// const i = (this.state.toString(16).length - 1) * 4;
		// return i + 32 - Math.clz32(Number(this.state >> BigInt(i))) - 1;

		// VAR 3
		// return this.state.toString(2).length - 1;
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
