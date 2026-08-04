import { PAWN_TEMPLATE, PIECE_TEMPLATE, type StartingPieceName } from '#board/piece-names';
import type { PlayerColor } from '#types/tokens';

export type { PieceName, PromotedPieceName, StartingPieceName } from '#board/piece-names';
export { isPromotedPieceName, isStartingPieceName } from '#board/piece-names';

/**
 * Starting-position piece identity for piece-scoped heatmap presets.
 * Names encode file (e.g. `Qd`, `Nb`, `Pa`); color disambiguates white vs black.
 */
export interface HeatmapPieceRef {
    color: PlayerColor;
    name: StartingPieceName;
}

type PieceStats = { [piece in StartingPieceName]: number };
export type PieceStatsMap = { [piece in StartingPieceName]: PieceStats };

export const pieceList: StartingPieceName[] = [...PAWN_TEMPLATE, ...PIECE_TEMPLATE];
