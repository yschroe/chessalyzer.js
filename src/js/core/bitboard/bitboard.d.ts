/* tslint:disable */
/* eslint-disable */
/**
*/
export class BitBoard {
  free(): void;
/**
* @param {bigint} state
*/
  constructor(state: bigint);
/**
* @param {number} target_idx
* @param {string} piece_type
* @param {number} must_be_in_row
* @param {number} must_be_in_col
* @returns {BitBoard}
*/
  get_legal_pieces(target_idx: number, piece_type: string, must_be_in_row: number, must_be_in_col: number): BitBoard;
/**
* @param {number} bit_idx
*/
  invert_bit(bit_idx: number): void;
/**
* @returns {number}
*/
  get_highest_bit_idx(): number;
/**
*/
  print_board(): void;
}
