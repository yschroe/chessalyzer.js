function generateAttackMasks() {
	// STRAIGHT
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

	// DIAG
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

	// KNIGHT
	const knightMask: bigint[] = [];
	for (let i = 0; i < 64; i += 1) {
		const iBig = BigInt(i);
		const pieceMask = 1n << iBig;

		const m1 = ~(files[0] | files[1]);
		const m2 = ~files[0];
		const m3 = ~files[7];
		const m4 = ~(files[7] | files[6]);

		const s1 = (pieceMask & m1) << 6n;
		const s2 = (pieceMask & m2) << 15n;
		const s3 = (pieceMask & m3) << 17n;
		const s4 = (pieceMask & m4) << 10n;
		const s5 = (pieceMask & m4) >> 6n;
		const s6 = (pieceMask & m3) >> 15n;
		const s7 = (pieceMask & m2) >> 17n;
		const s8 = (pieceMask & m1) >> 10n;

		knightMask.push(s1 | s2 | s3 | s4 | s5 | s6 | s7 | s8);
	}

	return {
		STRAIGHT: attacksStraight,
		DIAG: attacksDiag,
		KNIGHT: knightMask,
		FILES: files,
		RANKS: ranks
	};
}

const MASKS = generateAttackMasks();

export default class BitBoard {
	state: bigint;
	constructor(value: bigint) {
		this.state = value;
	}

	getLegalPieces(
		targetIdx: number,
		pieceType: string,
		mustBeInRow: number | null,
		mustBeInCol: number | null
	) {
		if ((this.state & -this.state) === this.state) return this.state;

		let mask = 0n;
		switch (pieceType) {
			case 'N':
				mask |= MASKS.KNIGHT[targetIdx];
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

		if (mustBeInRow !== null) mask &= MASKS.RANKS[7 - mustBeInRow];
		if (mustBeInCol !== null) mask &= MASKS.FILES[7 - mustBeInCol];

		return this.state & mask;
	}

	invertBit(bitIdx: number) {
		const mask = 1n << BigInt(bitIdx);
		this.state ^= mask;
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
