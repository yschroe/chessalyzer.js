// Import our outputted wasm ES6 module
// Which, export default's, an initialization function
import init from '../pkg/chessalyzer_js_rust.js';

console.log(init.add(1, 2));
// const runWasm = async () => {
// 	// Instantiate our wasm module
// 	const helloWorld = await init('../pkg/chessalyzer_js_rust_bg.wasm');

// 	// Call the Add function export from wasm, save the result
// 	const addResult = helloWorld.add(24, 24);

// 	// Set the result onto the body
// 	console.log(`Hello World! addResult: ${addResult}`);
// };
// runWasm();
