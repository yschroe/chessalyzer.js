import type { PlayerColor } from '#types/tokens';

/** Minimal game object built while streaming PGN movetext. */
export interface Game {
    Result?: string;
    ECO?: string;
    moves: string[];
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
