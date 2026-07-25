//! Precomputed lookup tables for attack masks and board geometry.
//!
//! These tables are built entirely at compile time (`const fn`), so there is
//! zero runtime cost for generating them. The approach is adapted from
//! [snakefish](https://github.com/cglouch/snakefish).

use const_for::const_for;

/// For each target square, which squares a piece type could attack from
/// (ignoring blockers — blocker checks happen separately in `board.rs`).
pub struct Attacks {
    pub queen: [u64; 64],
    pub rook: [u64; 64],
    pub bishop: [u64; 64],
    pub knight: [u64; 64],
}

/// Masks for ranks, files, individual squares, and SAN disambiguation filters.
pub struct Masks {
    pub rank: [u64; 8],
    pub file: [u64; 8],
    /// Index `0` = no filter (`ALL`), `1..8` = ranks, `9..16` = files.
    pub ranks_and_files: [u64; 17],
    /// Single-bit mask for each square (`cell[n] = 1 << n`).
    pub cell: [u64; 64],
}

const fn generate_masks() -> Masks {
    let mut rank = [0; 8];
    let mut file = [0; 8];
    let mut ranks_and_files = [u64::MAX; 17];
    let mut cell = [0; 64];

    const_for!(idx in 0..8 => {
        // Rank mask: eight consecutive bits on the same rank.
        let rank_mask = 0x00000000000000FF << (8 * idx);
        // File mask: one bit per rank on the same file (repeating pattern).
        let file_mask = 0x0101010101010101 << idx;
        rank[idx] = rank_mask;
        file[idx] = file_mask;
        ranks_and_files[idx + 1] = rank_mask;
        ranks_and_files[idx + 1 + 8] = file_mask;
    });

    const_for!(idx in 0..64 => {
        cell[idx] = 1 << idx as u64;
    });

    Masks {
        rank,
        file,
        ranks_and_files,
        cell,
    }
}

const fn generate_attacks(masks: Masks) -> Attacks {
    let mut queen: [u64; 64] = [0; 64];
    let mut rook: [u64; 64] = [0; 64];
    let mut bishop: [u64; 64] = [0; 64];
    let mut knight: [u64; 64] = [0; 64];

    const_for!(idx in 0..64 => {
        let piece_mask = masks.cell[idx];

        // --- Rook / queen straight rays (entire rank + file, minus own square) ---
        // `idx / 8` gives the rank (0 = h1–a1, 7 = h8–a8), `idx % 8` gives the file.
        let rank_mask = masks.rank[idx / 8];
        let file_mask = masks.file[idx % 8];
        let straight_attacks = (rank_mask | file_mask) ^ piece_mask;

        // --- Bishop / queen diagonal rays ---
        // These formulas compute the full diagonal/anti-diagonal through `idx`
        // using bit tricks (see snakefish for the derivation).
        let diag = 8 * (idx as i64 & 7) - (idx as i64 & 56);
        let north_diag = -diag & (diag >> 31);
        let south_diag = diag & (-diag >> 31);
        let diag_mask = (0x8040201008040201_u64 >> south_diag) << north_diag;

        let anti_diag = 56 - 8 * (idx as i64 & 7) - (idx as i64 & 56);
        let north_anti_diag = -anti_diag & (anti_diag >> 31);
        let south_anti_diag = anti_diag & (-anti_diag >> 31);
        let anti_diag_mask = (0x0102040810204080_u64 >> south_anti_diag) << north_anti_diag;

        let diag_attacks = (diag_mask | anti_diag_mask) ^ piece_mask;

        // --- Knight leaps (edge-aware to avoid board wrap-around) ---
        // Without the file masks (`m1`–`m4`), knight shifts would wrap from
        // the h-file to the a-file (and vice versa) on a 64-bit board.
        let m1 = !(masks.file[0] | masks.file[1]);
        let m2 = !masks.file[0];
        let m3 = !masks.file[7];
        let m4 = !(masks.file[7] | masks.file[6]);
        let s1 = (piece_mask & m1) << 6;
        let s2 = (piece_mask & m2) << 15;
        let s3 = (piece_mask & m3) << 17;
        let s4 = (piece_mask & m4) << 10;
        let s5 = (piece_mask & m4) >> 6;
        let s6 = (piece_mask & m3) >> 15;
        let s7 = (piece_mask & m2) >> 17;
        let s8 = (piece_mask & m1) >> 10;

        rook[idx] = straight_attacks;
        bishop[idx] = diag_attacks;
        queen[idx] = straight_attacks | diag_attacks;
        knight[idx] = s1 | s2 | s3 | s4 | s5 | s6 | s7 | s8;
    });

    Attacks {
        queen,
        rook,
        bishop,
        knight,
    }
}

// --- First-rank move tables (used for O(1) rank/file clear-path checks) ---
// These precompute which squares are reachable along an 8-square line for every
// possible occupancy pattern. `board.rs` uses them for straight `clear_path`
// checks; diagonals still use square-by-square ray walking.

/// All squares reachable from `from_file` on one rank, given `occupancy`
/// (bit `0` = h-file … bit `7` = a-file). Includes the first blocker square
/// (for captures) but nothing beyond it.
const fn rank_attacks(from_file: u8, occupancy: u8) -> u8 {
    let mut attacks = 0u8;

    // Toward h-file (decreasing file index).
    let mut f = from_file as i32 - 1;
    while f >= 0 {
        attacks |= 1u8 << f;
        if occupancy & (1u8 << f) != 0 {
            break;
        }
        f -= 1;
    }

    // Toward a-file (increasing file index).
    f = from_file as i32 + 1;
    while f < 8 {
        attacks |= 1u8 << f;
        if occupancy & (1u8 << f) != 0 {
            break;
        }
        f += 1;
    }

    attacks
}

const fn compute_first_rank_moves() -> [[u8; 256]; 8] {
    let mut first_rank_moves: [[u8; 256]; 8] = [[0; 256]; 8];

    const_for!(from_file in 0..8 => {
        const_for!(occ in 0..256_u16 => {
            first_rank_moves[from_file][occ as usize] =
                rank_attacks(from_file as u8, occ as u8);
        });
    });

    first_rank_moves
}

pub const MASKS: Masks = generate_masks();
pub const ATTACKS: Attacks = generate_attacks(MASKS);

/// Per-square, per-occupancy attack masks along a single rank (8-bit occupancy).
/// `FIRST_RANK_MOVES[square][occ]` returns which squares are reachable from `square`
/// on a rank when `occ` is the 8-bit occupancy (bit 0 = h-file, bit 7 = a-file).
pub const FIRST_RANK_MOVES: [[u8; 256]; 8] = compute_first_rank_moves();
