/**
 * Low-level chess domain literals used across board, parsing, and tracker code.
 *
 * Kept separate from action/game types because these are pure type aliases
 * with no structural shape — they annotate SAN tokens and side-to-move fields.
 */

/** Pawn move file prefix in SAN (lowercase a–h). Not used in piece position lists. */
export type PawnToken = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h';

/** Major/minor piece letter in SAN (uppercase R/N/B/Q/K). */
export type PieceToken = 'R' | 'N' | 'B' | 'Q' | 'K';

/** Any single-character SAN piece/pawn/castle prefix. */
export type Token = PieceToken | PawnToken | 'O';

/** Side to move or piece color. */
export type PlayerColor = 'b' | 'w';
