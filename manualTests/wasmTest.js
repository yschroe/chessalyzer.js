// Import our outputted wasm ES6 module
// Which, export default's, an initialization function
import { BitBoard } from '../pkg/bitboard.js';

console.log(new BitBoard().get_state());
