// The wasm-pack uses wasm-bindgen to build and generate JavaScript binding file.
// Import the wasm-bindgen crate.
use wasm_bindgen::prelude::*;

const TEST: u64 = 64;

#[wasm_bindgen]
pub struct BitBoard {
    state: u64,
}

#[wasm_bindgen]
impl BitBoard {
    #[wasm_bindgen(constructor)]
    pub fn new() -> BitBoard {
        BitBoard { state: 0 }
    }

    pub fn get_state(&self) -> u64 {
        return self.state + TEST;
    }
}
