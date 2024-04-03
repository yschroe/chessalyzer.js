mod tables;
use std::num::NonZeroU64;

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
        BitBoard {
            state,
            initial_state: state,
        }
    }

    pub fn reset(&mut self) {
        self.state = self.initial_state
    }

    pub fn get_legal_pieces(
        &self,
        target_idx: usize,
        piece_type: char,
        must_be_in_row_or_col: usize,
    ) -> u32 {
        let non_zero_state;
        unsafe {
            non_zero_state = NonZeroU64::new_unchecked(self.state);
        }

        // If there is only one piece left in mask, return it.
        if non_zero_state.is_power_of_two() {
            return non_zero_state.trailing_zeros();
        }

        let mut mask = match piece_type {
            'N' => tables::ATTACKS.knight[target_idx],
            'Q' => tables::ATTACKS.queen[target_idx],
            'B' => tables::ATTACKS.bishop[target_idx],
            'R' => tables::ATTACKS.rook[target_idx],
            'K' => u64::MAX,
            _ => panic!(),
        };

        mask &= tables::MASKS.ranks_and_files[must_be_in_row_or_col];

        let masked_state;
        unsafe {
            masked_state = NonZeroU64::new_unchecked(self.state & mask);
        }
        if masked_state.is_power_of_two() {
            return masked_state.trailing_zeros();
        }

        // TODO: Using FIRST_RANK_MOVES here so it is no dead code.
        // Actual logic needs to be implemented
        (self.state & tables::FIRST_RANK_MOVES[0][0] as u64).ilog2()
    }

    pub fn invert_bit(&mut self, bit_idx: usize) {
        self.state ^= tables::MASKS.cell[bit_idx];
    }

    pub fn print_board(&self) {
        // Board
        for rank in 0..8 {
            let rank_slice = (self.state >> (8 * (7 - rank))) & 0b11111111;
            log(format!("{rank_slice:08b}").replace('0', ".").as_str());
        }
        log("");
    }
}
