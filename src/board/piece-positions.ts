import type { BoardCoord } from '#board/board-coords';
import type { MutableBoardCoord } from '#board/board-coords';
import type { PieceToken, PlayerColor } from '#types/tokens';

/**
 * Maintains live position lists for each non-pawn piece type (R/N/B/Q/K) of one side.
 *
 * Used by {@link ChessBoard} and {@link PieceFinder} to resolve ambiguous SAN like `Nbd2`
 * without scanning all 64 squares. Pawns are not indexed here — their origin is inferred
 * from the target square and board state.
 *
 * Each list entry is a reused `[row, col]` array mutated in place on move/capture.
 * Callers must not reassign or splice these arrays; only the numeric coordinates change.
 */
export default class PiecePositions {
    R: MutableBoardCoord[] = [];
    N: MutableBoardCoord[] = [];
    B: MutableBoardCoord[] = [];
    Q: MutableBoardCoord[] = [];
    K: MutableBoardCoord[] = [];

    private readonly startRow: number;

    /** Pre-allocated coord pairs for the 16 starting pieces — reset() rewires the lists to these. */
    private readonly ra: MutableBoardCoord = [0, 0];
    private readonly rh: MutableBoardCoord = [0, 0];
    private readonly nb: MutableBoardCoord = [0, 0];
    private readonly ng: MutableBoardCoord = [0, 0];
    private readonly bc: MutableBoardCoord = [0, 0];
    private readonly bf: MutableBoardCoord = [0, 0];
    private readonly qd: MutableBoardCoord = [0, 0];
    private readonly ke: MutableBoardCoord = [0, 0];

    constructor(player: PlayerColor) {
        // Internal coords: row 0 = rank 8, row 7 = rank 1 (matches board tile layout).
        this.startRow = player === 'w' ? 7 : 0;
        this.reset();
    }

    /** Restore starting positions. Clears promoted-piece entries from lists via length = 0. */
    reset(): void {
        const row = this.startRow;
        this.ra[0] = row;
        this.ra[1] = 0;
        this.nb[0] = row;
        this.nb[1] = 1;
        this.bc[0] = row;
        this.bc[1] = 2;
        this.qd[0] = row;
        this.qd[1] = 3;
        this.ke[0] = row;
        this.ke[1] = 4;
        this.bf[0] = row;
        this.bf[1] = 5;
        this.ng[0] = row;
        this.ng[1] = 6;
        this.rh[0] = row;
        this.rh[1] = 7;

        this.R.length = 0;
        this.N.length = 0;
        this.B.length = 0;
        this.Q.length = 0;
        this.K.length = 0;

        this.R.push(this.ra, this.rh);
        this.N.push(this.nb, this.ng);
        this.B.push(this.bc, this.bf);
        this.Q.push(this.qd);
        this.K.push(this.ke);
    }

    /**
     * Live list of squares holding this piece type. May contain 0–2 entries (more after promotion).
     * @param token SAN piece letter (R/N/B/Q/K).
     */
    listForToken(token: PieceToken): MutableBoardCoord[] {
        switch (token) {
            case 'R':
                return this.R;
            case 'N':
                return this.N;
            case 'B':
                return this.B;
            case 'Q':
                return this.Q;
            case 'K':
                return this.K;
        }
    }

    /** Map ASCII char code ('R'=82, 'N'=78, …) to the corresponding list. Returns null for pawns. */
    private listForChar(tokenChar: number): MutableBoardCoord[] | null {
        switch (tokenChar) {
            case 82:
                return this.R;
            case 78:
                return this.N;
            case 66:
                return this.B;
            case 81:
                return this.Q;
            case 75:
                return this.K;
            default:
                return null;
        }
    }

    /**
     * Move the piece at `from` to `to` within the position list.
     * Pawns (char code 80 / 'P') are intentionally not tracked here.
     */
    moveByChar(tokenChar: number, from: BoardCoord, to: BoardCoord): void {
        const list = this.listForChar(tokenChar);
        if (!list) return;

        const [fromRow, fromCol] = from;

        for (let i = 0; i < list.length; i += 1) {
            const p = list[i];
            if (!p) continue;
            if (p[0] === fromRow && p[1] === fromCol) {
                p[0] = to[0];
                p[1] = to[1];
                return;
            }
        }
    }

    /**
     * Remove the piece at `on` from its type list (swap-with-last for O(1) removal).
     */
    captureByChar(tokenChar: number, on: BoardCoord): void {
        const list = this.listForChar(tokenChar);
        if (!list) return;

        const [row, col] = on;

        for (let i = 0; i < list.length; i += 1) {
            const p = list[i];
            if (!p) continue;
            if (p[0] === row && p[1] === col) {
                const last = list.length - 1;
                list[i] = list[last]!;
                list.pop();
                return;
            }
        }
    }

    capture(takenPieceName: string, on: BoardCoord): void {
        this.captureByChar(takenPieceName.charCodeAt(0), on);
    }

    /** Register a newly promoted piece (gets a fresh `[row, col]` entry, not from the pre-allocated pool). */
    promote(pieceName: string, on: BoardCoord): void {
        const list = this.listForChar(pieceName.charCodeAt(0));
        const [row, col] = on;
        if (!list || row === undefined || col === undefined) return;
        list.push([row, col]);
    }
}
