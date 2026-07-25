import type { ChessPiece, Action, MoveAction, CaptureAction, PromoteAction } from '../interfaces';
import type { PieceToken, PlayerColor } from '../types';

/**
 * Per-token live position lists. `findPiece` reads these arrays directly (no copy).
 * Entries are owned `[row, col]` arrays mutated in place on move.
 */
class PiecePositions {
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

class ChessBoard {
    // prettier-ignore
    private static defaultTiles = new Uint8Array([
        129, 130, 131, 132, 133, 134, 135, 136,
        137, 138, 139, 140, 141, 142, 143, 144,
        0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0,
        9, 10, 11, 12, 13, 14, 15, 16,
        1, 2, 3, 4, 5, 6, 7, 8
    ]);
    private static pieceLookupList = [
        null,
        'Ra',
        'Nb',
        'Bc',
        'Qd',
        'Ke',
        'Bf',
        'Ng',
        'Rh',
        'Pa',
        'Pb',
        'Pc',
        'Pd',
        'Pe',
        'Pf',
        'Pg',
        'Ph',
    ];
    private tiles: Uint8Array;
    private pieces: { w: PiecePositions; b: PiecePositions };
    private promotedPieces: {
        w: string[];
        b: string[];
    };

    constructor() {
        this.tiles = ChessBoard.defaultTiles.slice();
        this.pieces = {
            w: new PiecePositions('w'),
            b: new PiecePositions('b'),
        };
        this.promotedPieces = {
            w: [],
            b: [],
        };
    }

    getPieceOnCoords(coords: number[]): ChessPiece | null {
        const pieceNumber = this.tiles[coords[0] * 8 + coords[1]];
        if (pieceNumber === 0) return null;

        const color: PlayerColor = pieceNumber & 0b10000000 ? 'b' : 'w';
        const pieceIdx = pieceNumber & 0b01111111;
        const name =
            ChessBoard.pieceLookupList[pieceIdx] ??
            this.promotedPieces[color][pieceIdx - ChessBoard.pieceLookupList.length - 1];

        return { name, color };
    }

    /** Hot-path helper: piece name only, no object allocation. */
    getPieceNameOnCoords(coords: number[]): string | null {
        return this.getPieceNameAt(coords[0], coords[1]);
    }

    isEmpty(coords: number[]): boolean {
        return this.tiles[coords[0] * 8 + coords[1]] === 0;
    }

    isEmptyAt(row: number, col: number): boolean {
        return this.tiles[row * 8 + col] === 0;
    }

    /** True if square holds a pawn (standard piece indices 9–16). */
    isPawnAt(row: number, col: number): boolean {
        const idx = this.tiles[row * 8 + col] & 0b01111111;
        return idx >= 9 && idx <= 16;
    }

    getPieceNameAt(row: number, col: number): string | null {
        const pieceNumber = this.tiles[row * 8 + col];
        if (pieceNumber === 0) return null;

        const color: PlayerColor = pieceNumber & 0b10000000 ? 'b' : 'w';
        const pieceIdx = pieceNumber & 0b01111111;

        return (
            ChessBoard.pieceLookupList[pieceIdx] ??
            this.promotedPieces[color][pieceIdx - ChessBoard.pieceLookupList.length - 1] ??
            null
        );
    }

    getPieceColorAt(row: number, col: number): PlayerColor | null {
        const pieceNumber = this.tiles[row * 8 + col];
        if (pieceNumber === 0) return null;
        return pieceNumber & 0b10000000 ? 'b' : 'w';
    }

    getKingPosition(player: PlayerColor): number[] {
        return this.pieces[player].K[0];
    }

    /**
     * Live position list for a piece token. Do not mutate the array structure.
     */
    getPositionsForToken(player: PlayerColor, token: PieceToken): number[][] {
        return this.pieces[player].listForToken(token);
    }

    applyActions(actions: Action[]): void {
        const len = actions.length;
        for (let i = 0; i < len; i += 1) {
            const action = actions[i];
            switch (action.type) {
                case 'move':
                    this.move(action);
                    break;
                case 'capture':
                    this.capture(action);
                    break;
                case 'promote':
                    this.promote(action);
                    break;
            }
        }
    }

    movePiece(player: PlayerColor, piece: string, from: number[], to: number[]): void {
        this.moveByToken(player, piece.charCodeAt(0), from, to);
    }

    /** Move using SAN piece token char ('N','P',...). Avoids piece-name lookups on the fast path. */
    moveByToken(player: PlayerColor, tokenChar: number, from: number[], to: number[]): void {
        const fromIdx = from[0] * 8 + from[1];
        const toIdx = to[0] * 8 + to[1];
        this.tiles[toIdx] = this.tiles[fromIdx];
        this.tiles[fromIdx] = 0;
        this.pieces[player].moveByChar(tokenChar, from, to);
    }

    capturePiece(player: PlayerColor, takenPiece: string, on: number[]): void {
        this.pieces[player === 'w' ? 'b' : 'w'].capture(takenPiece, on);
        this.tiles[on[0] * 8 + on[1]] = 0;
    }

    /** Capture whatever is on `on` (reads token from the tile, then clears it). */
    captureAt(player: PlayerColor, on: number[]): void {
        const onIdx = on[0] * 8 + on[1];
        const pieceNumber = this.tiles[onIdx];
        if (pieceNumber === 0) return;

        this.tiles[onIdx] = 0;

        const pieceIdx = pieceNumber & 0b01111111;
        // Pawns are not tracked in piece lists.
        if (pieceIdx >= 9 && pieceIdx <= 16) return;

        const color: PlayerColor = pieceNumber & 0b10000000 ? 'b' : 'w';
        const name =
            ChessBoard.pieceLookupList[pieceIdx] ??
            this.promotedPieces[color][pieceIdx - ChessBoard.pieceLookupList.length - 1];
        if (!name) return;

        this.pieces[player === 'w' ? 'b' : 'w'].captureByChar(name.charCodeAt(0), on);
    }

    promotePiece(player: PlayerColor, on: number[], to: string): void {
        const pieceNumber =
            (player === 'w' ? 0b00000000 : 0b10000000) |
            (this.promotedPieces[player].length + ChessBoard.pieceLookupList.length + 1);

        const piecename = `${to}${pieceNumber}`;

        this.promotedPieces[player].push(piecename);
        this.tiles[on[0] * 8 + on[1]] = pieceNumber;
        this.pieces[player].promote(piecename, on);
    }

    reset(): void {
        this.tiles.set(ChessBoard.defaultTiles);
        this.pieces.w.reset();
        this.pieces.b.reset();
        this.promotedPieces.w.length = 0;
        this.promotedPieces.b.length = 0;
    }

    /** Prints the current board position to the console. */
    printPosition(): void {
        console.log(this.tiles);
        for (let row = 0; row < 8; row += 1) {
            process.stdout.write(`${8 - row} `);

            for (let col = 0; col < 8; col += 1) {
                const piece = this.getPieceOnCoords([row, col]);
                if (piece !== null) {
                    process.stdout.write(`|${piece.color}${piece.name}|`);
                } else {
                    process.stdout.write('|...|');
                }
            }
            process.stdout.write('\n');
        }

        process.stdout.write(`    a    b    c    d    e    f    g    h\n`);
    }

    private move(action: MoveAction): void {
        this.movePiece(action.player, action.piece, action.from, action.to);
    }

    private capture(action: CaptureAction): void {
        this.capturePiece(action.player, action.takenPiece, action.on);
    }

    private promote(action: PromoteAction): void {
        this.promotePiece(action.player, action.on, action.to);
    }
}

export default ChessBoard;
