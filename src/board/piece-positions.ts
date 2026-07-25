import type { PieceToken, PlayerColor } from '../types';

/**
 * Per-token live position lists. `findPiece` reads these arrays directly (no copy).
 * Entries are owned `[row, col]` arrays mutated in place on move.
 */
export default class PiecePositions {
    R: number[][] = [];
    N: number[][] = [];
    B: number[][] = [];
    Q: number[][] = [];
    K: number[][] = [];

    private readonly startRow: number;
    private readonly ra: number[] = [0, 0];
    private readonly rh: number[] = [0, 0];
    private readonly nb: number[] = [0, 0];
    private readonly ng: number[] = [0, 0];
    private readonly bc: number[] = [0, 0];
    private readonly bf: number[] = [0, 0];
    private readonly qd: number[] = [0, 0];
    private readonly ke: number[] = [0, 0];

    constructor(player: PlayerColor) {
        this.startRow = player === 'w' ? 7 : 0;
        this.reset();
    }

    reset(): void {
        const row = this.startRow;
        this.ra[0] = row;
        this.ra[1] = 0;
        this.rh[0] = row;
        this.rh[1] = 7;
        this.nb[0] = row;
        this.nb[1] = 1;
        this.ng[0] = row;
        this.ng[1] = 6;
        this.bc[0] = row;
        this.bc[1] = 2;
        this.bf[0] = row;
        this.bf[1] = 5;
        this.qd[0] = row;
        this.qd[1] = 3;
        this.ke[0] = row;
        this.ke[1] = 4;

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

    listForToken(token: PieceToken): number[][] {
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
            default:
                return this.K;
        }
    }

    private listForChar(tokenChar: number): number[][] | null {
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

    /** Update piece at `from` to `to` by position (pawns/token 80 are ignored). */
    moveByChar(tokenChar: number, from: number[], to: number[]): void {
        const list = this.listForChar(tokenChar);
        if (!list) return;

        const fromRow = from[0];
        const fromCol = from[1];
        for (let i = 0; i < list.length; i += 1) {
            const p = list[i];
            if (p[0] === fromRow && p[1] === fromCol) {
                p[0] = to[0];
                p[1] = to[1];
                return;
            }
        }
    }

    move(pieceName: string, from: number[], to: number[]): void {
        this.moveByChar(pieceName.charCodeAt(0), from, to);
    }

    /** Remove piece at `on` by position. */
    captureByChar(tokenChar: number, on: number[]): void {
        const list = this.listForChar(tokenChar);
        if (!list) return;

        const row = on[0];
        const col = on[1];
        for (let i = 0; i < list.length; i += 1) {
            const p = list[i];
            if (p[0] === row && p[1] === col) {
                const last = list.length - 1;
                list[i] = list[last];
                list.pop();
                return;
            }
        }
    }

    capture(takenPieceName: string, on: number[]): void {
        this.captureByChar(takenPieceName.charCodeAt(0), on);
    }

    /** Add a promoted piece on `on`. */
    promote(pieceName: string, on: number[]): void {
        const list = this.listForChar(pieceName.charCodeAt(0));
        if (!list) return;
        list.push([on[0], on[1]]);
    }
}
