import type { PlayerColor } from '#types/tokens';

/** Game object built while streaming PGN movetext. Header tags are string values. */
export interface Game {
    moves: string[];
    Result?: string;
    ECO?: string;
    [header: string]: string | string[] | undefined;
}

/** Board square pair used in move actions. */
export interface Move {
    from: number[];
    to: number[];
}

/** Piece on a square (promoted pawns may have non-standard names). */
export interface ChessPiece {
    name: string;
    color: PlayerColor;
}

/** Context for one square when evaluating heatmap preset functions. */
export interface SquareData {
    alg: string;
    coords: number[];
    piece: { color: PlayerColor; name: string };
}
