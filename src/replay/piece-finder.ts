import type { BoardCoord, MutableBoardCoord } from '#board/board-coords';
import type ChessBoard from '#board/chess-board';
import { ReplayFailure } from '#replay/replay-failure';
import type { PieceToken, PlayerColor } from '#types/tokens';

/**
 * Lookup tables indexed by piece char code ('Q'=81, 'R'=82, 'B'=66, …).
 * Used to quickly test whether a piece can reach a square along a rank/file (LINE)
 * or diagonal (DIAG). Knights bypass these and use fixed L-shape geometry.
 */
const LINE = new Uint8Array(91);
const DIAG = new Uint8Array(91);
LINE[81] = 1; // Q
LINE[82] = 1; // R
DIAG[81] = 1; // Q
DIAG[66] = 1; // B

/** Thrown when no candidate piece can legally reach the target square. */
function moveNotFoundFailure(
    token: string,
    player: PlayerColor,
    tarRow: number,
    tarCol: number,
): ReplayFailure {
    return new ReplayFailure(
        'IllegalMove',
        `${player}: No piece for move ${token} to (${tarRow},${tarCol}) found!`,
    );
}

/**
 * Resolves ambiguous piece moves in SAN (e.g. `Nbd2`, `Rfe1`) to a unique `[row, col]`.
 *
 * Given a target square and optional file/rank disambiguator from the SAN token,
 * filters the live piece list from {@link ChessBoard}, then:
 * 1. Applies geometry (knight L-shape, or line/diag alignment for sliders)
 * 2. Checks that the path is not blocked (sliders only)
 * 3. Rejects candidates that would expose the king to a discovered check
 */
export default class PieceFinder {
    /** Reused buffer for candidate filtering — avoids per-move array allocation. */
    private readonly filterBuf: MutableBoardCoord[] = [];

    constructor(private readonly board: ChessBoard) {}

    /**
     * Find the `[row, col]` of the piece that should move to `toPosition`.
     * @param mustBeInRow Board row index (0=rank 8) if SAN specifies a rank, else null.
     * @param mustBeInCol Board col index (0=file a) if SAN specifies a file, else null.
     * @param tokenChar ASCII code of piece letter (e.g. 'N' → 78).
     */
    findPiece(
        toPosition: BoardCoord,
        mustBeInRow: number | null,
        mustBeInCol: number | null,
        token: PieceToken,
        tokenChar: number,
        player: PlayerColor,
    ): MutableBoardCoord {
        const [tarRow, tarCol] = toPosition;
        if (tarRow === undefined || tarCol === undefined) {
            throw moveNotFoundFailure(token, player, -1, -1);
        }

        const validPieces = this.board.getPositionsForToken(player, token);
        const len = validPieces.length;

        if (len === 1) {
            const only = validPieces[0];
            if (!only) {
                throw moveNotFoundFailure(token, player, tarRow, tarCol);
            }
            return only;
        }

        const isKnight = tokenChar === 78;
        const allowLine = LINE[tokenChar];
        const allowDiag = DIAG[tokenChar];
        const filtered = this.filterBuf;
        filtered.length = 0;

        // Pass 1: filter by disambiguator + coarse geometry (same rank/file/diag or knight L).
        for (let i = 0; i < len; i += 1) {
            const val = validPieces[i];
            if (!val) continue;
            const [row, col] = val;
            if (row === undefined || col === undefined) continue;

            if (mustBeInRow !== null && row !== mustBeInRow) continue;
            if (mustBeInCol !== null && col !== mustBeInCol) continue;

            const rowDiff = row > tarRow ? row - tarRow : tarRow - row;
            const colDiff = col > tarCol ? col - tarCol : tarCol - col;

            if (isKnight) {
                if ((rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2)) {
                    filtered.push(val);
                }
                continue;
            }

            if (
                (allowLine && (rowDiff === 0 || colDiff === 0)) ||
                (allowDiag && rowDiff === colDiff)
            ) {
                filtered.push(val);
            }
        }

        if (filtered.length === 1) {
            const only = filtered[0];
            if (!only) {
                throw moveNotFoundFailure(token, player, tarRow, tarCol);
            }
            return only;
        }

        // Pass 2: path blocking + discovered-check filter among remaining candidates.
        const board = this.board;
        pieceLoop: for (let p = 0; p < filtered.length; p += 1) {
            const piece = filtered[p];
            if (!piece) continue;
            const [pieceRow, pieceCol] = piece;
            if (pieceRow === undefined || pieceCol === undefined) continue;

            if (!isKnight) {
                const dRow = tarRow - pieceRow;
                const dCol = tarCol - pieceCol;
                const absRow = dRow < 0 ? -dRow : dRow;
                const absCol = dCol < 0 ? -dCol : dCol;
                const steps = absRow > absCol ? absRow : absCol;
                const dirRow = dRow === 0 ? 0 : dRow > 0 ? 1 : -1;
                const dirCol = dCol === 0 ? 0 : dCol > 0 ? 1 : -1;
                for (let i = 1; i < steps; i += 1) {
                    if (!board.isEmptyAt(pieceRow + i * dirRow, pieceCol + i * dirCol)) {
                        continue pieceLoop;
                    }
                }
            }

            if (!this.checkCheck(piece, toPosition, player)) {
                return piece;
            }
        }

        throw moveNotFoundFailure(token, player, tarRow, tarCol);
    }

    /**
     * Returns true if moving `from` → `to` would expose the king to discovered check.
     *
     * Only relevant when `from` lies on the same rank, file, or diagonal as our king
     * (the direction the moving piece would "unblock"). Walks from the king toward the
     * edge; if an enemy queen/rook/bishop can attack through the vacated `from` square,
     * the move is rejected.
     */
    private checkCheck(from: BoardCoord, to: BoardCoord, player: PlayerColor): boolean {
        const opColor = player === 'w' ? 'b' : 'w';
        const king = this.board.getKingPosition(player);
        const [kingRow, kingCol] = king;
        const [fromRow, fromCol] = from;
        const [toRow, toCol] = to;
        if (
            kingRow === undefined ||
            kingCol === undefined ||
            fromRow === undefined ||
            fromCol === undefined ||
            toRow === undefined ||
            toCol === undefined
        ) {
            return false;
        }

        const diff0 = fromRow - kingRow;
        const diff1 = fromCol - kingCol;
        let check0: number;
        let check1: number;
        if (diff0 === 0 || diff1 === 0) {
            check0 = 81; // Q
            check1 = 82; // R
        } else if ((diff0 < 0 ? -diff0 : diff0) === (diff1 < 0 ? -diff1 : diff1)) {
            check0 = 81;
            check1 = 66; // B
        } else {
            // `from` is not aligned with the king — moving it cannot discover a line check.
            return false;
        }
        const vertDir = diff0 === 0 ? 0 : diff0 > 0 ? 1 : -1;
        const horzDir = diff1 === 0 ? 0 : diff1 > 0 ? 1 : -1;

        // How far we can walk from the king along this ray before hitting the board edge.
        let distanceHorizontal = 8;
        if (horzDir !== 0) {
            distanceHorizontal = horzDir === -1 ? kingCol : 7 - kingCol;
        }
        let distanceVertical = 8;
        if (vertDir !== 0) {
            distanceVertical = vertDir === -1 ? kingRow : 7 - kingRow;
        }
        const distanceToEdge =
            distanceHorizontal < distanceVertical ? distanceHorizontal : distanceVertical;
        // Need at least king → from → enemy piece; fewer squares means no discovery possible.
        if (distanceToEdge < 2) return false;

        const board = this.board;
        for (let i = 1; i <= distanceToEdge; i += 1) {
            const row = kingRow + i * vertDir;
            const col = kingCol + i * horzDir;

            if (row === toRow && col === toCol) break;
            if (row === fromRow && col === fromCol) continue;

            const name = board.getPieceNameAt(row, col);
            if (name) {
                if (board.getPieceColorAt(row, col) !== opColor) return false;
                const t = name.charCodeAt(0);
                return t === check0 || t === check1;
            }
        }

        return false;
    }
}
