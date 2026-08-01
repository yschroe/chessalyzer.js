// oxfmt-ignore
export type Piece =
    | 'Pa' | 'Pb' | 'Pc' | 'Pd' | 'Pe' | 'Pf' | 'Pg' | 'Ph'
    | 'Ra' | 'Nb' | 'Bc' | 'Qd' | 'Ke' | 'Bf' | 'Ng' | 'Rh';

type PieceStats = { [piece in Piece]: number };
export type PieceStatsMap = { [piece in Piece]: PieceStats };

// oxfmt-ignore
export const pieceList: Piece[] = [
    'Pa', 'Pb', 'Pc', 'Pd', 'Pe', 'Pf', 'Pg', 'Ph',
    'Ra', 'Nb', 'Bc', 'Qd', 'Ke', 'Bf', 'Ng', 'Rh',
];

const trackedPieceSet = new Set<string>(pieceList);

export function isTrackedPiece(name: string): name is Piece {
    return trackedPieceSet.has(name);
}

export function isPieceTrackerData(data: unknown): data is { b: PieceStatsMap; w: PieceStatsMap } {
    return typeof data === 'object' && data !== null && 'b' in data && 'w' in data;
}
