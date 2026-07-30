/**
 * Low-level chess domain literals used across board, replay, and tracker code.
 *
 * Kept separate from action/game types because these are pure type aliases
 * with no structural shape — they annotate SAN tokens and side-to-move fields.
 */

/** Major/minor piece letter in SAN (uppercase R/N/B/Q/K). */
export type PieceToken = 'R' | 'N' | 'B' | 'Q' | 'K';

/** Promotion target piece letter (king promotion is illegal). */
export type PromotionToken = Exclude<PieceToken, 'K'>;

const promotionTokenSet = new Set<string>(['R', 'N', 'B', 'Q']);

/** True when `value` is a legal promotion piece letter (R/N/B/Q). */
export function isPromotionToken(value: string): value is PromotionToken {
    return promotionTokenSet.has(value);
}

/** Side to move or piece color. */
export type PlayerColor = 'b' | 'w';
