import BitBoard from '../lib/core/BitBoard.js';

function computeFirstRankMoves(i, occ) {
	const leftRay = (x) => x -1
	const rightRay = (x) => ~x & ~(x-1)

	const x = 1n << i

	const leftAttacks = leftRay(x)
	const leftBlockers = leftAttacks & occ
	if (leftBlockers > 0) {
		const leftmost = 1n <<
	}
}

def compute_first_rank_moves(i, occ):
    # i is square index from 0 to 8
    # occ is 8-bit number that represents occupancy of the rank 
    # Returns first rank moves (as uint8)

    left_ray = lambda x: x - np.uint8(1)
    right_ray = lambda x: (~x) & ~(x - np.uint8(1))

    x = np.uint8(1) << np.uint8(i)
    occ = np.uint8(occ)

    left_attacks = left_ray(x)
    left_blockers = left_attacks & occ
    if left_blockers != np.uint8(0):
        leftmost = np.uint8(1) << bitboard.msb_bitscan(np.uint64(left_blockers))
        left_garbage = left_ray(leftmost)
        left_attacks ^= left_garbage

    right_attacks = right_ray(x)
    right_blockers = right_attacks & occ
    if right_blockers != np.uint8(0):
        rightmost = np.uint8(1) << bitboard.lsb_bitscan(np.uint64(right_blockers))
        right_garbage = right_ray(rightmost)
        right_attacks ^= right_garbage

    return left_attacks ^ right_attacks



FIRST_RANK_MOVES = np.fromiter(
        (compute_first_rank_moves(i, occ)
            for i in range(8) # 8 squares in a rank 
            for occ in range(256)), # 2^8 = 256 possible occupancies of a rank
        dtype=np.uint8,
        count=8*256)
FIRST_RANK_MOVES.shape = (8,256)