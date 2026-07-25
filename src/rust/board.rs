use crate::tables;
use wasm_bindgen::prelude::*;

const W_P: u64 = 0x0000_0000_0000_ff00;
const W_R: u64 = 0x0000_0000_0000_0081;
const W_N: u64 = 0x0000_0000_0000_0042;
const W_B: u64 = 0x0000_0000_0000_0024;
const W_Q: u64 = 0x0000_0000_0000_0010;
const W_K: u64 = 0x0000_0000_0000_0008;

const B_P: u64 = 0x00ff_0000_0000_0000;
const B_R: u64 = 0x8100_0000_0000_0000;
const B_N: u64 = 0x4200_0000_0000_0000;
const B_B: u64 = 0x2400_0000_0000_0000;
const B_Q: u64 = 0x1000_0000_0000_0000;
const B_K: u64 = 0x0800_0000_0000_0000;

#[derive(Clone, Copy)]
struct PieceSet {
    p: u64,
    n: u64,
    b: u64,
    r: u64,
    q: u64,
    k: u64,
}

impl PieceSet {
    const fn starting(white: bool) -> Self {
        if white {
            PieceSet {
                p: W_P,
                n: W_N,
                b: W_B,
                r: W_R,
                q: W_Q,
                k: W_K,
            }
        } else {
            PieceSet {
                p: B_P,
                n: B_N,
                b: B_B,
                r: B_R,
                q: B_Q,
                k: B_K,
            }
        }
    }

    fn occupancy(&self) -> u64 {
        self.p | self.n | self.b | self.r | self.q | self.k
    }

    fn bb_mut(&mut self, token: char) -> &mut u64 {
        match token {
            'P' => &mut self.p,
            'N' => &mut self.n,
            'B' => &mut self.b,
            'R' => &mut self.r,
            'Q' => &mut self.q,
            'K' => &mut self.k,
            _ => unreachable!(),
        }
    }

    fn bb(&self, token: char) -> u64 {
        match token {
            'P' => self.p,
            'N' => self.n,
            'B' => self.b,
            'R' => self.r,
            'Q' => self.q,
            'K' => self.k,
            _ => unreachable!(),
        }
    }
}

#[wasm_bindgen]
pub struct Board {
    white: PieceSet,
    black: PieceSet,
    occupancy: u64,
}

impl Clone for Board {
    fn clone(&self) -> Self {
        Board {
            white: self.white,
            black: self.black,
            occupancy: self.occupancy,
        }
    }
}

impl Board {
    fn is_in_check(&self, player: char) -> bool {
        let king_sq = self.pieces(player).bb('K').trailing_zeros();
        let opponent = if player == 'w' { 'b' } else { 'w' };
        self.is_square_attacked(king_sq, opponent)
    }

    fn is_square_attacked(&self, sq: u32, by: char) -> bool {
        let pieces = self.pieces(by);

        if tables::ATTACKS.knight[sq as usize] & pieces.n != 0 {
            return true;
        }

        if pawn_attacks(sq, by) & pieces.p != 0 {
            return true;
        }

        if king_attacks(sq) & pieces.k != 0 {
            return true;
        }

        if attacks_from_sliders(sq, pieces.b, self.occupancy, false) {
            return true;
        }

        if attacks_from_sliders(sq, pieces.r, self.occupancy, true) {
            return true;
        }

        if attacks_from_sliders(sq, pieces.q, self.occupancy, false)
            || attacks_from_sliders(sq, pieces.q, self.occupancy, true)
        {
            return true;
        }

        false
    }
}

#[wasm_bindgen]
impl Board {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        let mut board = Board {
            white: PieceSet::starting(true),
            black: PieceSet::starting(false),
            occupancy: 0,
        };
        board.recompute_occupancy();
        board
    }

    pub fn reset(&mut self) {
        self.white = PieceSet::starting(true);
        self.black = PieceSet::starting(false);
        self.recompute_occupancy();
    }

    fn recompute_occupancy(&mut self) {
        self.occupancy = self.white.occupancy() | self.black.occupancy();
    }

    fn pieces(&self, player: char) -> &PieceSet {
        match player {
            'w' => &self.white,
            'b' => &self.black,
            _ => unreachable!(),
        }
    }

    fn pieces_mut(&mut self, player: char) -> &mut PieceSet {
        match player {
            'w' => &mut self.white,
            'b' => &mut self.black,
            _ => unreachable!(),
        }
    }

    pub fn move_piece(&mut self, player: char, token: char, from: u32, to: u32) {
        let bb = self.pieces_mut(player).bb_mut(token);
        *bb ^= (1_u64 << from) | (1_u64 << to);
        self.occupancy ^= (1_u64 << from) | (1_u64 << to);
    }

    pub fn capture_piece(&mut self, player: char, token: char, sq: u32) {
        let bb = self.pieces_mut(player).bb_mut(token);
        *bb ^= 1_u64 << sq;
        self.occupancy ^= 1_u64 << sq;
    }

    pub fn promote_piece(&mut self, player: char, to_token: char, sq: u32) {
        let pieces = self.pieces_mut(player);
        pieces.p ^= 1_u64 << sq;
        *pieces.bb_mut(to_token) ^= 1_u64 << sq;
    }

    fn capture_at(&mut self, sq: u32) {
        let mask = 1_u64 << sq;
        for token in ['P', 'N', 'B', 'R', 'Q', 'K'] {
            if self.white.bb(token) & mask != 0 {
                *self.white.bb_mut(token) ^= mask;
                self.occupancy ^= mask;
                return;
            }
            if self.black.bb(token) & mask != 0 {
                *self.black.bb_mut(token) ^= mask;
                self.occupancy ^= mask;
                return;
            }
        }
    }

    fn simulate_move(&mut self, player: char, token: char, from: u32, to: u32) {
        if self.occupancy & (1_u64 << to) != 0 {
            self.capture_at(to);
        }
        self.move_piece(player, token, from, to);
    }

    pub fn find_attacker(
        &self,
        player: char,
        piece_type: char,
        target_idx: u32,
        disambiguation: usize,
    ) -> i32 {
        let pieces = self.pieces(player).bb(piece_type);

        if pieces.count_ones() == 1 {
            return pieces.trailing_zeros() as i32;
        }

        let mut mask = attack_mask(piece_type, target_idx as usize);
        mask &= tables::MASKS.ranks_and_files[disambiguation];

        let candidates = pieces & mask;
        if candidates == 0 {
            return -1;
        }

        let candidates = if piece_type == 'N' || piece_type == 'K' {
            candidates
        } else {
            filter_by_clear_path(candidates, target_idx, self.occupancy)
        };

        resolve_candidates(self, player, piece_type, target_idx, candidates)
    }
}

fn resolve_candidates(
    board: &Board,
    player: char,
    token: char,
    target_idx: u32,
    candidates: u64,
) -> i32 {
    if candidates == 0 {
        return -1;
    }

    if candidates.count_ones() == 1 {
        return candidates.trailing_zeros() as i32;
    }

    let mut remaining = candidates;
    let mut found = -1i32;

    while remaining != 0 {
        let from = remaining.trailing_zeros();
        remaining &= remaining - 1;

        let mut next = board.clone();
        next.simulate_move(player, token, from, target_idx);
        if next.is_in_check(player) {
            continue;
        }

        if found != -1 {
            return -1;
        }
        found = from as i32;
    }

    found
}

fn attack_mask(piece_type: char, target_idx: usize) -> u64 {
    match piece_type {
        'N' => tables::ATTACKS.knight[target_idx],
        'Q' => tables::ATTACKS.queen[target_idx],
        'B' => tables::ATTACKS.bishop[target_idx],
        'R' => tables::ATTACKS.rook[target_idx],
        'K' => u64::MAX,
        _ => unreachable!(),
    }
}

fn filter_by_clear_path(candidates: u64, target_idx: u32, occupancy: u64) -> u64 {
    let mut remaining = candidates;
    let mut result = 0u64;

    while remaining != 0 {
        let sq = remaining.trailing_zeros();
        remaining &= remaining - 1;

        if clear_path(sq, target_idx, occupancy) {
            result |= 1_u64 << sq;
        }
    }

    result
}

fn pawn_attacks(sq: u32, by: char) -> u64 {
    let rank = sq / 8;
    let file = sq % 8;
    let mut attacks = 0u64;
    let rank_delta = if by == 'w' { 1i32 } else { -1i32 };

    for df in [-1i32, 1] {
        let nr = rank as i32 + rank_delta;
        let nf = file as i32 + df;
        if (0..8).contains(&nr) && (0..8).contains(&nf) {
            attacks |= 1_u64 << (nr * 8 + nf);
        }
    }

    attacks
}

fn king_attacks(sq: u32) -> u64 {
    let rank = sq / 8;
    let file = sq % 8;
    let mut attacks = 0u64;

    for dr in -1i32..=1 {
        for df in -1i32..=1 {
            if dr == 0 && df == 0 {
                continue;
            }
            let nr = rank as i32 + dr;
            let nf = file as i32 + df;
            if (0..8).contains(&nr) && (0..8).contains(&nf) {
                attacks |= 1_u64 << (nr * 8 + nf);
            }
        }
    }

    attacks
}

fn attacks_from_sliders(sq: u32, pieces: u64, occupancy: u64, straight: bool) -> bool {
    let mut remaining = pieces;

    while remaining != 0 {
        let from = remaining.trailing_zeros();
        remaining &= remaining - 1;

        if !aligned(from, sq, straight) {
            continue;
        }

        if clear_path(from, sq, occupancy) {
            return true;
        }
    }

    false
}

fn aligned(from: u32, to: u32, straight: bool) -> bool {
    let dr = (from / 8).abs_diff(to / 8);
    let df = (from % 8).abs_diff(to % 8);

    if straight {
        dr == 0 || df == 0
    } else {
        dr == df && dr != 0
    }
}

fn clear_path(from: u32, to: u32, occupancy: u64) -> bool {
    let from_rank = (from / 8) as i32;
    let from_file = (from % 8) as i32;
    let to_rank = (to / 8) as i32;
    let to_file = (to % 8) as i32;

    let dr = to_rank - from_rank;
    let df = to_file - from_file;

    if dr == 0 && df == 0 {
        return false;
    }

    if dr != 0 && df != 0 && dr.abs() != df.abs() {
        return false;
    }

    let step_rank = dr.signum();
    let step_file = df.signum();

    let mut rank = from_rank + step_rank;
    let mut file = from_file + step_file;

    while rank != to_rank || file != to_file {
        let idx = (rank * 8 + file) as u32;
        if occupancy & (1_u64 << idx) != 0 {
            return false;
        }
        rank += step_rank;
        file += step_file;
    }

    true
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sq(file: u32, rank: u32) -> u32 {
        (7 - file) + 8 * (rank - 1)
    }

    #[test]
    fn starting_position_reset() {
        let board = Board::new();
        assert_eq!(board.white.bb('R'), W_R);
        assert_eq!(board.occupancy.count_ones(), 32);
    }

    #[test]
    fn single_rook_skips_blocker_check() {
        let mut board = Board::new();
        board.white = PieceSet {
            p: 0,
            n: 0,
            b: 0,
            r: 0,
            q: 0,
            k: 1 << sq(4, 1),
        };
        board.black = PieceSet {
            p: 0,
            n: 0,
            b: 0,
            r: 1 << sq(0, 8),
            q: 0,
            k: 1 << sq(4, 8),
        };
        board.recompute_occupancy();

        let idx = board.find_attacker('b', 'R', sq(0, 4), 0);
        assert_eq!(idx, sq(0, 8) as i32);
    }

    #[test]
    fn blocked_rook_picks_unblocked() {
        let mut board = Board::new();
        board.white = PieceSet {
            p: 1 << sq(1, 4),
            n: 0,
            b: 0,
            r: 0,
            q: 0,
            k: 1 << sq(4, 1),
        };
        board.black = PieceSet {
            p: 0,
            n: 0,
            b: 0,
            r: (1 << sq(0, 4)) | (1 << sq(7, 4)),
            q: 0,
            k: 1 << sq(4, 8),
        };
        board.recompute_occupancy();

        // a4 rook blocked by pawn on b4; h4 rook reaches e4 via f4
        let e4 = sq(4, 4);
        let attacker = board.find_attacker('b', 'R', e4, 0);
        assert_eq!(attacker, sq(7, 4) as i32);
    }

    #[test]
    fn two_rooks_same_rank_unblocked_both_reach_is_ambiguous() {
        let mut board = Board::new();
        board.white = PieceSet {
            p: 0,
            n: 0,
            b: 0,
            r: 0,
            q: 0,
            k: 1 << sq(4, 1),
        };
        board.black = PieceSet {
            p: 0,
            n: 0,
            b: 0,
            r: (1 << sq(0, 4)) | (1 << sq(7, 4)),
            q: 0,
            k: 1 << sq(4, 8),
        };
        board.recompute_occupancy();

        let e4 = sq(4, 4);
        assert_eq!(board.find_attacker('b', 'R', e4, 0), -1);
    }

    #[test]
    fn file_disambiguation_selects_correct_rook() {
        let mut board = Board::new();
        board.white = PieceSet {
            p: 0,
            n: 0,
            b: 0,
            r: 0,
            q: 0,
            k: 1 << sq(4, 1),
        };
        board.black = PieceSet {
            p: 0,
            n: 0,
            b: 0,
            r: (1 << sq(0, 4)) | (1 << sq(7, 4)),
            q: 0,
            k: 1 << sq(4, 8),
        };
        board.recompute_occupancy();

        let e4 = sq(4, 4);
        // 'a' file -> disambiguation index 16
        assert_eq!(board.find_attacker('b', 'R', e4, 16), sq(0, 4) as i32);
        // 'h' file -> disambiguation index 9
        assert_eq!(board.find_attacker('b', 'R', e4, 9), sq(7, 4) as i32);
    }

    #[test]
    fn bxh6_position_finds_c1_bishop() {
        let mut board = Board::new();
        let sq = |file: u32, rank: u32| -> u32 { (7 - file) + 8 * (rank - 1) };

        board.move_piece('w', 'P', sq(4, 2), sq(4, 4));
        board.move_piece('b', 'P', sq(4, 7), sq(4, 6));
        board.move_piece('w', 'P', sq(3, 2), sq(3, 4));
        board.move_piece('b', 'P', sq(1, 7), sq(1, 6));
        board.move_piece('w', 'P', sq(0, 2), sq(0, 3));
        board.move_piece('b', 'B', sq(2, 8), sq(1, 7));
        board.move_piece('w', 'N', sq(6, 1), sq(2, 3));
        board.move_piece('b', 'N', sq(6, 8), sq(7, 6));

        let h6 = sq(7, 6);
        let attacker = board.find_attacker('w', 'B', h6, 0);
        assert_eq!(attacker, sq(2, 1) as i32);
    }

    #[test]
    fn clear_path_rejects_blocked_diagonal() {
        let from = sq(2, 1);
        let to = sq(5, 4);
        let occ = 1_u64 << sq(3, 2);
        assert!(!clear_path(from, to, occ));
        assert!(clear_path(from, to, 0));
    }
}
