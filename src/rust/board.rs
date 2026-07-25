//! Chess board represented as bitboards (one u64 mask per piece type and color).
//!
//! ## Square indexing
//! Squares use the same indexing as the JavaScript side (see `Utils.algebraicToBitIndex`):
//! - `h1 = 0`, `g1 = 1`, …, `a1 = 7`, `h2 = 8`, …, `a8 = 63`
//! - Rank increases with the index (`idx / 8`), file is `idx % 8` (`0 = h-file`).
//!
//! ## Bitboard basics
//! A bitboard is a 64-bit integer where each bit corresponds to one square.
//! If bit `n` is set, a piece of that type occupies square `n`.
//! Updating the board is usually done with XOR (`^=`), which toggles bits on/off.

use crate::tables;
use wasm_bindgen::prelude::*;

// --- Starting position masks (computed once at compile time) -----------------
// White pieces sit on ranks 1–2 (low bits), black on ranks 7–8 (high bits).

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

/// Bitboards for all six piece types of one color.
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
    /// Returns the standard starting position for white or black.
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

    /// Union of all piece types — every occupied square for this color.
    /// Equivalent to OR-ing all six bitboards together.
    fn occupancy(&self) -> u64 {
        self.p | self.n | self.b | self.r | self.q | self.k
    }

    /// Returns a mutable reference to the bitboard for `token` (`P`, `N`, …).
    /// Rust `match` selects the correct field — no runtime string lookup.
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

/// Full board state exposed to JavaScript via wasm-bindgen.
#[wasm_bindgen]
pub struct Board {
    white: PieceSet,
    black: PieceSet,
    /// All occupied squares (both colors). Updated incrementally on every change.
    occupancy: u64,
    /// Stable piece identifiers for tracker statistics (mirrors JS `pieceNames`).
    #[wasm_bindgen(skip)]
    pub(crate) piece_names: Vec<Option<String>>,
    #[wasm_bindgen(skip)]
    pub(crate) promote_counter: u32,
}

impl Clone for Board {
    fn clone(&self) -> Self {
        Board {
            white: self.white,
            black: self.black,
            occupancy: self.occupancy,
            piece_names: self.piece_names.clone(),
            promote_counter: self.promote_counter,
        }
    }
}

impl Board {
    /// Returns `true` if the given player's king is currently attacked.
    fn is_in_check(&self, player: char) -> bool {
        let king_sq = self.pieces(player).bb('K').trailing_zeros();
        let opponent = if player == 'w' { 'b' } else { 'w' };
        self.is_square_attacked(king_sq, opponent)
    }

    /// Checks whether `sq` is attacked by any piece belonging to `by`.
    fn is_square_attacked(&self, sq: u32, by: char) -> bool {
        let pieces = self.pieces(by);

        // Knights and pawns use precomputed attack tables / simple formulas.
        if tables::ATTACKS.knight[sq as usize] & pieces.n != 0 {
            return true;
        }

        if pawn_attacks(sq, by) & pieces.p != 0 {
            return true;
        }

        if king_attacks(sq) & pieces.k != 0 {
            return true;
        }

        // Sliders (bishop/rook/queen) need blocker-aware ray checks.
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
            piece_names: Vec::new(),
            promote_counter: 0,
        };
        board.recompute_occupancy();
        board.init_piece_names();
        board
    }

    pub fn reset(&mut self) {
        self.white = PieceSet::starting(true);
        self.black = PieceSet::starting(false);
        self.recompute_occupancy();
        self.init_piece_names();
    }

    /// Parses and applies all SAN moves in one WASM call (no action data returned).
    pub fn process_game_quiet(&mut self, moves: Vec<String>) {
        self.process_game_quiet_moves(&moves);
    }

    /// Parses all SAN moves in one WASM call and returns compact action data for trackers.
    pub fn process_game(&mut self, moves: Vec<String>) -> crate::san::ProcessedGame {
        self.process_game_moves(&moves)
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

    /// Moves a piece (same-type bit toggled off `from`, on `to`).
    /// XOR toggles bits: `(1<<from) | (1<<to)` flips both squares in one op.
    pub fn move_piece(&mut self, player: char, token: char, from: u32, to: u32) {
        let bb = self.pieces_mut(player).bb_mut(token);
        *bb ^= (1_u64 << from) | (1_u64 << to);
        // Occupancy XOR works because `from` becomes empty and `to` becomes occupied.
        self.occupancy ^= (1_u64 << from) | (1_u64 << to);
    }

    /// Removes a piece from a square (capture).
    pub fn capture_piece(&mut self, player: char, token: char, sq: u32) {
        let bb = self.pieces_mut(player).bb_mut(token);
        *bb ^= 1_u64 << sq;
        self.occupancy ^= 1_u64 << sq;
    }

    /// Replaces a pawn with a promoted piece on the same square.
    /// Clears the pawn bit and sets the new piece type bit (occupancy unchanged).
    pub fn promote_piece(&mut self, player: char, to_token: char, sq: u32) {
        let pieces = self.pieces_mut(player);
        pieces.p ^= 1_u64 << sq;
        *pieces.bb_mut(to_token) ^= 1_u64 << sq;
    }

    /// Returns what occupies a square, encoded as an integer for cheap JS↔WASM calls.
    ///
    /// - `-1` — empty square
    /// - otherwise: `(color_bit) | (token as u8)` where color_bit is `0` for white, `256` for black
    ///
    /// JavaScript decodes with: `color = encoded & 256 ? 'b' : 'w'`, `token = String.fromCharCode(encoded & 0xff)`.
    pub fn get_piece_at(&self, idx: u32) -> i32 {
        let mask = 1_u64 << idx;
        if self.occupancy & mask == 0 {
            return -1;
        }

        for (player, color_bit) in [('w', 0i32), ('b', 256)] {
            let pieces = self.pieces(player);
            for token in ['P', 'N', 'B', 'R', 'Q', 'K'] {
                if pieces.bb(token) & mask != 0 {
                    return color_bit | (token as u8 as i32);
                }
            }
        }

        -1
    }

    /// Finds which pawn moves to `to_idx` (used when parsing pawn SAN like `e4` or `exd5`).
    ///
    /// `capture_file`:
    /// - `-1` for a quiet pawn push (scan 1 or 2 squares back along the file)
    /// - `0..7` for a capture, indicating the **file index** of the departing pawn
    ///   (`0 = h-file`, `7 = a-file`, matching the JS `getFileNumber` helper)
    pub fn find_pawn_from(&self, player: char, to_idx: u32, capture_file: i32) -> i32 {
        let pawns = self.pieces(player).bb('P');
        let direction: i32 = if player == 'w' { 1 } else { -1 };

        if capture_file >= 0 {
            // Capture: pawn on the given file attacks diagonally toward `to_idx`.
            let from = to_idx as i32 - 8 * direction + (capture_file - (to_idx % 8) as i32);
            if (0..64).contains(&from) && pawns & (1_u64 << from) != 0 {
                return from;
            }
            return -1;
        }

        // Quiet move: walk backward along the file (one or two steps for a double push).
        for steps in 1..=2 {
            let from = to_idx as i32 - 8 * steps * direction;
            if !(0..64).contains(&from) {
                break;
            }
            if pawns & (1_u64 << from) != 0 {
                return from;
            }
        }

        -1
    }

    /// Finds which piece of `piece_type` moves to `target_idx` (SAN disambiguation).
    ///
    /// `disambiguation` indexes into `tables::MASKS.ranks_and_files`:
    /// - `0` — no filter
    /// - `1..8` — restrict to a rank, `9..16` — restrict to a file (see JS `getTargetRowCol`)
    pub fn find_attacker(
        &self,
        player: char,
        piece_type: char,
        target_idx: u32,
        disambiguation: usize,
    ) -> i32 {
        let pieces = self.pieces(player).bb(piece_type);

        // Fast path: only one piece of this type remains on the board.
        if pieces.count_ones() == 1 {
            return pieces.trailing_zeros() as i32;
        }

        // Step 1: geometric reachability (precomputed attack tables + SAN hint).
        let mut mask = attack_mask(piece_type, target_idx as usize);
        mask &= tables::MASKS.ranks_and_files[disambiguation];

        let candidates = pieces & mask;
        if candidates == 0 {
            return -1;
        }

        // Step 2: for sliding pieces, remove paths blocked by other pieces.
        let candidates = if piece_type == 'N' || piece_type == 'K' {
            candidates
        } else {
            filter_by_clear_path(candidates, target_idx, self.occupancy)
        };

        // Step 3: if still ambiguous, simulate each move and reject illegal king moves.
        resolve_candidates(self, player, piece_type, target_idx, candidates)
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

    /// Applies a move on a temporary copy, removing any captured piece on `to` first.
    fn simulate_move(&mut self, player: char, token: char, from: u32, to: u32) {
        if self.occupancy & (1_u64 << to) != 0 {
            self.capture_at(to);
        }
        self.move_piece(player, token, from, to);
    }
}

/// When multiple candidates remain, pick the one that does not leave the king in check.
/// This handles pinned-piece situations where only one candidate is actually legal.
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

    // Iterate set bits with `trailing_zeros` + `remaining & remaining - 1`
    // (standard technique to loop over a bitboard without scanning all 64 squares).
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

/// Attack squares for `piece_type` reaching `target_idx` (ignores blockers).
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

/// Keeps only candidates whose path to `target_idx` is not obstructed.
fn filter_by_clear_path(candidates: u64, target_idx: u32, occupancy: u64) -> u64 {
    let mut remaining = candidates;
    let mut result = 0u64;

    // Iterate set bits with `trailing_zeros` + `remaining & remaining - 1`
    // (standard technique to loop over a bitboard without scanning all 64 squares).
    while remaining != 0 {
        let sq = remaining.trailing_zeros();
        remaining &= remaining - 1;

        if clear_path(sq, target_idx, occupancy) {
            result |= 1_u64 << sq;
        }
    }

    result
}

/// Squares attacked by enemy pawns of `by` if they stood on `sq`.
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

/// All eight king-adjacent squares from `sq`.
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

/// Returns `true` if any slider in `pieces` attacks `sq` along a clear ray.
fn attacks_from_sliders(sq: u32, pieces: u64, occupancy: u64, straight: bool) -> bool {
    let mut remaining = pieces;

    // Iterate set bits with `trailing_zeros` + `remaining & remaining - 1`
    // (standard technique to loop over a bitboard without scanning all 64 squares).
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

/// 8-bit occupancy for one rank (`bit 0` = h-file … `bit 7` = a-file).
fn rank_occupancy(occupancy: u64, rank: u32) -> u8 {
    ((occupancy >> (rank * 8)) & 0xFF) as u8
}

/// 8-bit occupancy for one file (`bit 0` = rank 1 … `bit 7` = rank 8).
fn file_occupancy(occupancy: u64, file: u32) -> u8 {
    let mut occ = 0u8;
    for rank in 0..8u32 {
        if occupancy & (1_u64 << (rank * 8 + file)) != 0 {
            occ |= 1_u8 << rank;
        }
    }
    occ
}

/// Fast rank/file clear-path check using precomputed `FIRST_RANK_MOVES` tables.
/// Returns `true` if `to` is reachable from `from` along the rank or file (inclusive
/// of a capture on `to`, but blocked by any piece strictly between).
fn clear_path_straight(from: u32, to: u32, occupancy: u64) -> bool {
    let from_rank = from / 8;
    let from_file = from % 8;
    let to_rank = to / 8;
    let to_file = to % 8;

    if from_rank == to_rank {
        // Same rank — one table lookup instead of a per-square loop.
        let rank_occ = rank_occupancy(occupancy, from_rank);
        let occ = rank_occ & !(1_u8 << from_file);
        let attacks = tables::FIRST_RANK_MOVES[from_file as usize][occ as usize];
        return (attacks >> to_file) & 1 != 0;
    }

    // Same file — extract file as an 8-bit line and reuse the same table.
    let file_occ = file_occupancy(occupancy, from_file);
    let occ = file_occ & !(1_u8 << from_rank);
    let attacks = tables::FIRST_RANK_MOVES[from_rank as usize][occ as usize];
    (attacks >> to_rank) & 1 != 0
}

/// Returns `true` if no occupied square lies strictly between `from` and `to`.
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

    // Rank or file — O(1) lookup via FIRST_RANK_MOVES.
    if dr == 0 || df == 0 {
        return clear_path_straight(from, to, occupancy);
    }

    // Diagonal — still walk square-by-square (no table yet).
    let step_rank = dr.signum();
    let step_file = df.signum();

    let mut rank = from_rank + step_rank;
    let mut file = from_file + step_file;

    // Walk toward `to`, but do not examine the destination (captures may sit there).
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
    fn get_piece_at_returns_encoded_piece() {
        let board = Board::new();
        // White king on e1
        let ke1 = board.get_piece_at(sq(4, 1));
        assert_eq!(ke1, 'K' as i32);
        assert_eq!(board.get_piece_at(sq(4, 4)), -1);
    }

    #[test]
    fn find_pawn_from_e4_push() {
        let board = Board::new();
        assert_eq!(board.find_pawn_from('w', sq(4, 4), -1), sq(4, 2) as i32);
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
        assert_eq!(board.find_attacker('b', 'R', e4, 16), sq(0, 4) as i32);
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

    #[test]
    fn clear_path_rank_uses_first_rank_moves() {
        // a4 to h4, blocker on e4 — blocked
        let from = sq(7, 4);
        let to = sq(0, 4);
        let blocked = (1_u64 << sq(4, 4)) | (1_u64 << from);
        assert!(!clear_path(from, to, blocked));

        // g4 to a4, blocker on e4 — g4 is beyond the blocker, so blocked
        let from = sq(6, 4);
        let occ = (1_u64 << sq(4, 4)) | (1_u64 << from);
        assert!(!clear_path(from, to, occ));

        // h4 to e4, blocker on e4 only — clear (capture on e4)
        let from = sq(0, 4);
        let to = sq(4, 4);
        let occ = (1_u64 << sq(4, 4)) | (1_u64 << from);
        assert!(clear_path(from, to, occ));
    }

    #[test]
    fn clear_path_file_uses_first_rank_moves() {
        // e1 to e8, blocker on e4
        let from = sq(4, 1);
        let to = sq(4, 8);
        let blocked = (1_u64 << sq(4, 4)) | (1_u64 << from);
        assert!(!clear_path(from, to, blocked));

        // e5 to e8 with blocker below on e4
        let from = sq(4, 5);
        assert!(clear_path(from, to, blocked));
    }
}
