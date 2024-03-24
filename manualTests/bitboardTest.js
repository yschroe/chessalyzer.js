import BitBoard from '../lib/core/BitBoard.js';

const bitboard = new BitBoard(
	0b0000000000000000000000000000000000000000000000000000000000100100n
);
bitboard.printBoard();

new BitBoard(bitboard.getLegalPieces(12, 'B')).printBoard();

console.log(Math.log2(Number(bitboard.getLegalPieces(12, 'B'))));

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
