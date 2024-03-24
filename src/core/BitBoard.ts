function generateAttackMasks() {
	const ranks: bigint[] = [];
	for (let rank = 0; rank < 8; rank += 1)
		ranks.push(0x00000000000000ffn << BigInt(8 * rank));

	const files: bigint[] = [];
	for (let file = 0; file < 8; file += 1)
		files.push(0x0101010101010101n << BigInt(file));

	const attacksStraight: bigint[] = [];
	for (let i = 0; i < 64; i += 1) {
		const rankMask = ranks[Math.floor(i / 8)];
		const fileMask = files[i % 8];
		const pieceMask = 1n << BigInt(i);
		attacksStraight.push((rankMask | fileMask) ^ pieceMask);
	}

	const attacksDiag: bigint[] = [];
	for (let i = 0; i < 64; i += 1) {
		const iBig = BigInt(i);
		const diag = 8n * (iBig & 7n) - (iBig & 56n);
		const northDiag = -diag & (diag >> 31n);
		const southDiag = diag & (-diag >> 31n);
		const diagMask = (0x8040201008040201n >> southDiag) << northDiag;

		const antiDiag = 56n - 8n * (iBig & 7n) - (iBig & 56n);
		const northAntiDiag = -antiDiag & (antiDiag >> 31n);
		const southAntiDiag = antiDiag & (-antiDiag >> 31n);
		const antiDiagMask =
			(0x0102040810204080n >> southAntiDiag) << northAntiDiag;

		const pieceMask = 1n << iBig;

		attacksDiag.push((diagMask | antiDiagMask) ^ pieceMask);
	}

	return { STRAIGHT: attacksStraight, DIAG: attacksDiag };
}

const MASKS = generateAttackMasks();

export default class BitBoard {
	state: bigint;
	constructor(value: bigint) {
		this.state = value;
	}

	getLegalPieces(targetIdx: number, pieceType: string) {
		let mask = 0n;
		switch (pieceType) {
			case 'N':
				break;
			case 'Q':
				mask |= MASKS.DIAG[targetIdx] | MASKS.STRAIGHT[targetIdx];
				break;
			case 'B':
				mask |= MASKS.DIAG[targetIdx];
				break;
			case 'R':
				mask |= MASKS.STRAIGHT[targetIdx];
				break;
		}
		return this.state & mask;
	}

	invertBit(bitIdx: number) {
		const mask = 1n << BigInt(bitIdx);
		this.state ^= mask;
	}

	printBoard() {
		// Rank
		// process.stdout.write(`${8 - row} `);
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

		// Files
		// process.stdout.write(`    a    b    c    d    e    f    g    h\n`);
	}
}
