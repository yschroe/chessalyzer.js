import { BitBoard } from '../src/js/core/bitboard/bitboard.js';

const a = new BitBoard(0x2400000000000000n);
a.print_board();

a.get_legal_pieces(54, 'B', -1, -1).print_board();
