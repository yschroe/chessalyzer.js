import { PAWN_TEMPLATE, PIECE_TEMPLATE, type Piece } from '#board/piece-names';
import type { PlayerColor } from '#types/tokens';

export type { BoardPieceName, Piece, PromotedPieceName } from '#board/piece-names';
export { isPromotedPieceName } from '#board/piece-names';

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
