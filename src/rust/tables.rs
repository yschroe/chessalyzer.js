// Reference: https://github.com/cglouch/snakefish/blob/master/src/tables.py
use const_for::const_for;

pub struct Attacks {
    pub queen: [u64; 64],
    pub rook: [u64; 64],
    pub bishop: [u64; 64],
    pub knight: [u64; 64],
}

pub struct Masks {
    pub rank: [u64; 8],
    pub file: [u64; 8],
    pub cell: [u64; 64],
}

const fn generate_masks() -> Masks {
    let mut rank: [u64; 8] = [0; 8];
    let mut file: [u64; 8] = [0; 8];
    let mut cell: [u64; 64] = [0; 64];

    const_for!(idx in 0..8 => {
        rank[idx] = 0x00000000000000FF << (8 * idx);
        file[idx] = 0x0101010101010101 << idx;
    });

    const_for!(idx in 0..64 => {
        cell[idx] = 1 << idx as u64;
    });

    Masks { rank, file, cell }
}

const fn generate_attacks(masks: Masks) -> Attacks {
    let mut queen: [u64; 64] = [0; 64];
    let mut rook: [u64; 64] = [0; 64];
    let mut bishop: [u64; 64] = [0; 64];
    let mut knight: [u64; 64] = [0; 64];

    const_for!(idx in 0..64 => {
        let piece_mask = masks.cell[idx];

        // STRAIGHT ATTACKS
        let rank_mask = masks.rank[idx / 8]; // We don't need floor here, int division automatically rounds down
        let file_mask = masks.file[idx % 8];
        let straight_attacks = (rank_mask | file_mask) ^ piece_mask;

        // DIAG ATTACKS
        let diag = 8 * (idx as i64 & 7) - (idx as i64 & 56);
        let north_diag = -diag & (diag >> 31);
        let south_diag = diag & (-diag >> 31);
        let diag_mask = (0x8040201008040201_u64 >> south_diag) << north_diag;

        let anti_diag = 56 - 8 * (idx as i64 & 7) - (idx as i64 & 56);
        let north_anti_diag = -anti_diag & (anti_diag >> 31);
        let south_anti_diag = anti_diag & (-anti_diag >> 31);
        let anti_diag_mask = (0x0102040810204080_u64 >> south_anti_diag) << north_anti_diag;

        let diag_attacks = (diag_mask | anti_diag_mask) ^ piece_mask;

        // KNIGHT ATTACKS
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

const fn left_ray(x: u8) -> u8 {
    x - 1_u8
}

const fn right_ray(x: u8) -> u8 {
    !x & !(x - 1_u8)
}

// TODO
const fn compute_first_rank_moves() -> [[u8; 256]; 8] {
    let mut first_rank_moves: [[u8; 256]; 8] = [[0; 256]; 8];

    const_for!(i in 0..8 => {
        let x = 1_u8 << i;
        const_for!(occ in 0..256_u16 => {
            let mut left_attacks = left_ray(x);
            let left_blockers = left_attacks & occ as u8;
            if left_blockers != 0 {
                let leftmost = 1_u8 << left_blockers.leading_zeros();
                let left_garbage = left_ray(leftmost);
                left_attacks ^= left_garbage;
            }

            let mut right_attacks = right_ray(x);
            let right_blockers = right_attacks & occ as u8;
            if right_blockers != 0 {
                let rightmost = 1 << right_blockers.trailing_zeros();
                let right_garbage = right_ray(rightmost);
                right_attacks ^= right_garbage
            }

            first_rank_moves[i][occ as usize] = left_attacks ^ right_attacks
        });

    });
    first_rank_moves
}

pub const MASKS: Masks = generate_masks();
pub const ATTACKS: Attacks = generate_attacks(MASKS);

pub const FIRST_RANK_MOVES: [[u8; 256]; 8] = compute_first_rank_moves();
