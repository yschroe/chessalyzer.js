import { Board } from '#bitboard';

const board = new Board();

function sq(file, rank) {
    return 7 - file + 8 * (rank - 1);
}

// Starting position: only g1 knight reaches f3
const nf3 = board.find_attacker('w', 'N', sq(5, 3), 0);
if (nf3 !== sq(6, 1)) {
    throw new Error(`Nf3 expected g1 (${sq(6, 1)}), got ${nf3}`);
}

// e4 pawn push from starting position
if (board.find_pawn_from('w', sq(4, 4), -1) !== sq(4, 2)) {
    throw new Error('e4 pawn from-square incorrect');
}

// get_piece_at on starting e2 pawn
const piece = board.get_piece_at(sq(4, 2));
if (piece !== 'P'.charCodeAt(0)) {
    throw new Error(`expected white pawn on e2, got ${piece}`);
}

console.log('wasmBoardTest passed');
