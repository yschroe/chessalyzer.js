/**
 * Low-level chess domain literals used across board, replay, and tracker code.
 *
 * Kept separate from action/game types because these are pure type aliases
 * with no structural shape — they annotate SAN tokens and side-to-move fields.
 */

/** Major/minor piece letter in SAN (uppercase R/N/B/Q/K). */
export type PieceToken = 'R' | 'N' | 'B' | 'Q' | 'K';

/** Side to move or piece color. */
export type PlayerColor = 'b' | 'w';
