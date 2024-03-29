// Import our outputted wasm ES6 module
// Which, export default's, an initialization function
import { BitBoard } from '../pkg/bitboard.js';

const a = new BitBoard(2n);
a.print_board();
