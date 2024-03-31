pub struct Masks {
    pub ranks: [u64; 8],
    pub files: [u64; 8],
    pub cell: [u64; 64],
    pub queen: [u64; 64],
    pub rook: [u64; 64],
    pub bishop: [u64; 64],
    pub knight: [u64; 64],
}

// Reference: https://github.com/cglouch/snakefish/blob/master/src/tables.py
pub const fn generate_masks() -> Masks {
    let mut ranks: [u64; 8] = [0; 8];
    let mut files: [u64; 8] = [0; 8];
    let mut idx: usize = 0;

    // For loops cannot be used in const fns -> use while.
    while idx < 8 {
        ranks[idx] = 0x00000000000000FF << (8 * idx);
        files[idx] = 0x0101010101010101 << idx;
        idx += 1
    }

    let mut queen: [u64; 64] = [0; 64];
    let mut rook: [u64; 64] = [0; 64];
    let mut bishop: [u64; 64] = [0; 64];
    let mut knight: [u64; 64] = [0; 64];
    let mut cell: [u64; 64] = [0; 64];

    idx = 0;
    while idx < 64 {
        let piece_mask = 1 << idx as u64;

        let rank_mask = ranks[idx / 8]; // We don't need floor here, int division automatically rounds down
        let file_mask = files[idx % 8];
        let straight_attacks = (rank_mask | file_mask) ^ piece_mask;

        let diag = 8 * (idx as i64 & 7) - (idx as i64 & 56);
        let north_diag = -diag & (diag >> 31);
        let south_diag = diag & (-diag >> 31);
        let diag_mask = (0x8040201008040201 as u64 >> south_diag) << north_diag;

        let anti_diag = 56 - 8 * (idx as i64 & 7) - (idx as i64 & 56);
        let north_anti_diag = -anti_diag & (anti_diag >> 31);
        let south_anti_diag = anti_diag & (-anti_diag >> 31);
        let anti_diag_mask = (0x0102040810204080 as u64 >> south_anti_diag) << north_anti_diag;

        let diag_attacks = (diag_mask | anti_diag_mask) ^ piece_mask;

        rook[idx] = straight_attacks;
        bishop[idx] = diag_attacks;
        queen[idx] = straight_attacks | diag_attacks;
        cell[idx] = piece_mask;

        // KNIGHT
        let m1 = !(files[0] | files[1]);
        let m2 = !files[0];
        let m3 = !files[7];
        let m4 = !(files[7] | files[6]);
        let s1 = (piece_mask & m1) << 6;
        let s2 = (piece_mask & m2) << 15;
        let s3 = (piece_mask & m3) << 17;
        let s4 = (piece_mask & m4) << 10;
        let s5 = (piece_mask & m4) >> 6;
        let s6 = (piece_mask & m3) >> 15;
        let s7 = (piece_mask & m2) >> 17;
        let s8 = (piece_mask & m1) >> 10;

        knight[idx] = s1 | s2 | s3 | s4 | s5 | s6 | s7 | s8;

        idx += 1
    }

    return Masks {
        ranks,
        files,
        cell,
        queen,
        rook,
        bishop,
        knight,
    };
}
