mod tables;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
extern "C" {
    // Make JS console.log available in Rust.
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

#[wasm_bindgen]
pub struct BitBoard {
    state: u64,
    initial_state: u64,
}

#[wasm_bindgen]
impl BitBoard {
    #[wasm_bindgen(constructor)]
    pub fn new(state: u64) -> BitBoard {
        return BitBoard {
            state,
            initial_state: state,
        };
    }

    pub fn reset(&mut self) {
        self.state = self.initial_state
    }

    pub fn get_legal_pieces(
        &self,
        target_idx: usize,
        piece_type: char,
        must_be_in_row: i8,
        must_be_in_col: i8,
    ) -> u32 {
        // If there is only one piece left in mask, return it.
        if self.state.is_power_of_two() {
            return self.state.ilog2();
        }

        let mut mask;
        match piece_type {
            'N' => mask = tables::ATTACKS.knight[target_idx],
            'Q' => mask = tables::ATTACKS.queen[target_idx],
            'B' => mask = tables::ATTACKS.bishop[target_idx],
            'R' => mask = tables::ATTACKS.rook[target_idx],
            'K' => mask = u64::MAX,
            _ => panic!(),
        }

        if must_be_in_row > -1 {
            mask &= tables::MASKS.rank[must_be_in_row as usize];
        } else if must_be_in_col > -1 {
            mask &= tables::MASKS.file[must_be_in_col as usize];
        }

        // TODO: We need to ensure only one piece remains!

        return (self.state & mask).ilog2();
    }

    pub fn invert_bit(&mut self, bit_idx: usize) {
        self.state ^= tables::MASKS.cell[bit_idx];
    }

    pub fn print_board(&self) {
        // Board
        for rank in 0..8 {
            let rank_slice = (self.state >> (8 * (7 - rank))) & 0b11111111;
            log(format!("{rank_slice:08b}").replace("0", ".").as_str());
        }
        log("");
    }
}
