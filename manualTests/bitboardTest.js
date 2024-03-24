import BitBoard from '../lib/core/BitBoard.js';

// const bitboard = new BitBoard(
// 	0b0000000000000000000000000000000000000000000000000000000000100100n
// );
// bitboard.printBoard();

// new BitBoard(bitboard.getLegalPieces(12, 'B')).printBoard();

// console.log(Math.log2(Number(bitboard.getLegalPieces(12, 'B'))));
const files = [];
for (let file = 0; file < 8; file += 1)
	files.push(0x0101010101010101n << BigInt(file));

// KNIGHT
const knightMask = [];
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

for (const b of knightMask) new BitBoard(b).printBoard();

// const ranks = [];
// for (let rank = 0; rank < 8; rank += 1)
// 	ranks.push(new BitBoard(0x00000000000000ffn << BigInt(8 * rank)));

// const files = [];
// for (let file = 0; file < 8; file += 1)
// 	files.push(new BitBoard(0x0101010101010101n << BigInt(file)));

// const attacksStraight = [];
// for (let i = 0; i < 64; i += 1) {
// 	const rankMask = ranks[Math.floor(i / 8)];
// 	const fileMask = files[i % 8];
// 	const pieceMask = 1n << BigInt(i);
// 	attacksStraight.push(
// 		new BitBoard((rankMask.state | fileMask.state) ^ pieceMask)
// 	);
// }

// const attacksDiag = [];
// for (let i = 0; i < 64; i += 1) {
// 	const iBig = BigInt(i);
// 	const diag = 8n * (iBig & 7n) - (iBig & 56n);
// 	const northDiag = -diag & (diag >> 31n);
// 	const southDiag = diag & (-diag >> 31n);
// 	const diagMask = (0x8040201008040201n >> southDiag) << northDiag;

// 	const antiDiag = 56n - 8n * (iBig & 7n) - (iBig & 56n);
// 	const northAntiDiag = -antiDiag & (antiDiag >> 31n);
// 	const southAntiDiag = antiDiag & (-antiDiag >> 31n);
// 	const antiDiagMask =
// 		(0x0102040810204080n >> southAntiDiag) << northAntiDiag;

// 	const pieceMask = 1n << iBig;

// 	attacksDiag.push(new BitBoard((diagMask | antiDiagMask) ^ pieceMask));
// }
// // attacksDiag.push(new BitBoard(0x00000000000000ffn << BigInt(8 * rank)));

// for (const b of attacksDiag) b.printBoard();
