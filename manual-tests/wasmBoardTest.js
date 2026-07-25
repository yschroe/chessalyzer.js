import { Board } from '#bitboard';

function sq(file, rank) {
    return 7 - file + 8 * (rank - 1);
}

const board = new Board();

// Starting position: only g1 knight reaches f3
const nf3 = board.find_attacker('w', 'N', sq(5, 3), 0);
if (nf3 !== sq(6, 1)) {
    throw new Error(`Nf3 expected g1 (${sq(6, 1)}), got ${nf3}`);
}

// Starting position: two rooks — Re4 has no geometric attacker
const re4 = board.find_attacker('w', 'R', sq(4, 3), 0);
if (re4 !== -1) {
    throw new Error(`Re4 from start should be -1, got ${re4}`);
}

console.log('wasmBoardTest passed');
