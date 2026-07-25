import { BitBoard } from '#bitboard';

const a = new BitBoard(0x2400000000000000n);
a.print_board();

console.log(a.get_legal_pieces(54, 'B', -1, -1));
