// Reference: https://github.com/cglouch/snakefish/blob/master/src/tables.py

const ranks: bigint[] = [];
for (let rank = 0; rank < 8; rank += 1)
	ranks.push(0x00000000000000ffn << BigInt(8 * rank));

const files: bigint[] = [];
for (let file = 0; file < 8; file += 1)
	files.push(0x0101010101010101n << BigInt(file));

const queenMasks: bigint[] = [];
const rookMasks: bigint[] = [];
const bishopMasks: bigint[] = [];
const knightMasks: bigint[] = [];

for (let i = 0; i < 64; i += 1) {
	const iBig = BigInt(i);
	const pieceMask = 1n << BigInt(i);

	// STRAIGHT
	const rankMask = ranks[Math.floor(i / 8)];
	const fileMask = files[i % 8];

	const straightAttacks = (rankMask | fileMask) ^ pieceMask;

	// DIAG
	const diag = 8n * (iBig & 7n) - (iBig & 56n);
	const northDiag = -diag & (diag >> 31n);
	const southDiag = diag & (-diag >> 31n);
	const diagMask = (0x8040201008040201n >> southDiag) << northDiag;

	const antiDiag = 56n - 8n * (iBig & 7n) - (iBig & 56n);
	const northAntiDiag = -antiDiag & (antiDiag >> 31n);
	const southAntiDiag = antiDiag & (-antiDiag >> 31n);
	const antiDiagMask =
		(0x0102040810204080n >> southAntiDiag) << northAntiDiag;

	const diagAttacks = (diagMask | antiDiagMask) ^ pieceMask;

	rookMasks.push(straightAttacks);
	bishopMasks.push(diagAttacks);
	queenMasks.push(diagAttacks | straightAttacks);

	// KNIGHT
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

	knightMasks.push(s1 | s2 | s3 | s4 | s5 | s6 | s7 | s8);
}

export default {
	QUEEN: queenMasks,
	ROOK: rookMasks,
	BISHOP: bishopMasks,
	KNIGHT: knightMasks,
	FILES: files,
	RANKS: ranks
};
