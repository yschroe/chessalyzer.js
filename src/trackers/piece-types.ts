import { PAWN_TEMPLATE, PIECE_TEMPLATE } from '#board/piece-names';
import type { PlayerColor } from '#types/tokens';

/** Starting-position piece names (`Pa`…`Ph`, `Ra`…`Rh`), derived from the canonical templates. */
export type Piece = (typeof PAWN_TEMPLATE)[number] | (typeof PIECE_TEMPLATE)[number];

/**
 * Starting-position piece identity for piece-scoped heatmap presets.
 * Names encode file (e.g. `Qd`, `Nb`, `Pa`); color disambiguates white vs black.
 */
export interface HeatmapPieceRef {
    color: PlayerColor;
    name: Piece;
}

type PieceStats = { [piece in Piece]: number };
export type PieceStatsMap = { [piece in Piece]: PieceStats };

export const pieceList: Piece[] = [...PAWN_TEMPLATE, ...PIECE_TEMPLATE];

const trackedPieceSet = new Set<string>(pieceList);

export function isTrackedPiece(name: string): name is Piece {
    return trackedPieceSet.has(name);
}
