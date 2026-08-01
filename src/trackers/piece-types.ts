import { PAWN_TEMPLATE, PIECE_TEMPLATE } from '#board/piece-names';

/** Starting-position piece names (`Pa`…`Ph`, `Ra`…`Rh`), derived from the canonical templates. */
export type Piece = (typeof PAWN_TEMPLATE)[number] | (typeof PIECE_TEMPLATE)[number];

type PieceStats = { [piece in Piece]: number };
export type PieceStatsMap = { [piece in Piece]: PieceStats };

export const pieceList: Piece[] = [...PAWN_TEMPLATE, ...PIECE_TEMPLATE];

const trackedPieceSet = new Set<string>(pieceList);

export function isTrackedPiece(name: string): name is Piece {
    return trackedPieceSet.has(name);
}
