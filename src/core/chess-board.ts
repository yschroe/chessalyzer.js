import type { ChessPiece, Action, MoveAction, CaptureAction, PromoteAction } from '../interfaces';
import type { PieceToken, PlayerColor } from '../types';

class PiecePositions {
    R: Map<string, number[]>;
    N: Map<string, number[]>;
    B: Map<string, number[]>;
    Q: Map<string, number[]>;
    K: Map<string, number[]>;

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
        this.R = new Map();
        this.N = new Map();
        this.B = new Map();
        this.Q = new Map();
        this.K = new Map();
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

        this.R.clear();
        this.N.clear();
        this.B.clear();
        this.Q.clear();
        this.K.clear();

        this.R.set('Ra', this.ra);
        this.R.set('Rh', this.rh);
        this.N.set('Nb', this.nb);
        this.N.set('Ng', this.ng);
        this.B.set('Bc', this.bc);
        this.B.set('Bf', this.bf);
        this.Q.set('Qd', this.qd);
        this.K.set('Ke', this.ke);
    }

    private mapFor(piece: string): Map<string, number[]> | null {
        switch (piece.charCodeAt(0)) {
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

    capture(piece: string): void {
        this.mapFor(piece)?.delete(piece);
    }

    /** Store destination by copying into an owned coords array (safe with pooled caller buffers). */
    move(piece: string, destinationSquare: number[]): void {
        const map = this.mapFor(piece);
        if (!map) return;

        let pos = map.get(piece);
        if (pos) {
            pos[0] = destinationSquare[0];
            pos[1] = destinationSquare[1];
        } else {
            map.set(piece, [destinationSquare[0], destinationSquare[1]]);
        }
    }

    promote(piece: string, onSquare: number[]): void {
        this.move(piece, onSquare);
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
    private readonly posBuf: number[][] = [];

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

    getPiecePosition(player: PlayerColor, piece: string) {
        const token = piece.charAt(0) as PieceToken;
        return this.pieces[player][token].get(piece);
    }

    /**
     * Returns positions for a piece token. Reuses an internal buffer — valid until the next call.
     */
    getPositionsForToken(player: PlayerColor, token: PieceToken): number[][] {
        const map = this.pieces[player][token];
        const buf = this.posBuf;
        let i = 0;
        for (const pos of map.values()) {
            buf[i++] = pos;
        }
        buf.length = i;
        return buf;
    }

    applyActions(actions: Action[]): void {
        for (let i = 0; i < actions.length; i += 1) {
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
        // Read indices before updating piece maps — `from` may be the owned
        // position array that move() mutates in place.
        const fromIdx = from[0] * 8 + from[1];
        const toIdx = to[0] * 8 + to[1];
        this.tiles[toIdx] = this.tiles[fromIdx];
        this.tiles[fromIdx] = 0;
        this.pieces[player].move(piece, to);
    }

    capturePiece(player: PlayerColor, takenPiece: string, on: number[]): void {
        this.pieces[player === 'w' ? 'b' : 'w'].capture(takenPiece);
        this.tiles[on[0] * 8 + on[1]] = 0;
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
