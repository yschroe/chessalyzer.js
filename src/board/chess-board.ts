import { squareToCoords } from '#board/board-coords';
import type { BoardCoord } from '#board/board-coords';
import type { MutableBoardCoord } from '#board/board-coords';
import type { ChessPiece } from '#board/chess-piece';
import {
    PAWN_TEMPLATE,
    PIECE_TEMPLATE,
    type BoardPieceName,
    type PromotedPieceName,
} from '#board/piece-names';
import PiecePositions from '#board/piece-positions';
import type { Action, MoveAction, CaptureAction, PromoteAction } from '#types/actions';
import type { PieceToken, PlayerColor, PromotionToken } from '#types/tokens';

/** Bit mask for the color of a piece. */
const COLOR_BIT_MASK = 0b10000000;
/** Bit mask for the index of a piece. */
const PIECE_INDEX_BIT_MASK = 0b01111111;

/**
 * Mutable chess position used while replaying SAN moves from a PGN.
 *
 * Combines two representations:
 * - **tiles**: dense `Uint8Array(64)` for occupancy and piece identity (hot path)
 * - **pieces**: per-side {@link PiecePositions} index for ambiguous piece lookup
 *
 * Tile encoding: one byte per square — high bit = color (0=white, 1=black),
 * low 7 bits = piece index into `pieceLookupList` (1–16 for standard pieces).
 * Promoted pawns get indices beyond 16, with names stored in `promotedPieces`.
 */
class ChessBoard {
    // oxfmt-ignore
    /**
     * Starting position of the board pieces in a binary representation.
     * The high bit is the color, the low 7 bits are the piece index (matching pieceLookupList).
     * For example:
     * 9   = 00001001 -> 0 = white, 0001001 = Pa (pawn on `a` file)
     * 130 = 10000010 -> 1 = black, 0000010 = Nb (knight on `b` file)
     */
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

    /** Index → piece name for standard pieces (index 0 unused). Derived from the starting-position templates. */
    private static pieceLookupList: ReadonlyArray<BoardPieceName | null> = [
        null,
        ...PIECE_TEMPLATE,
        ...PAWN_TEMPLATE,
    ];

    /** Dense 64-byte board; index always 0..63 for on-board row/col (reads use `!`). */
    private tiles: Uint8Array;

    /** Piece positions for each side. */
    private pieces: { w: PiecePositions; b: PiecePositions };

    /** Names for promoted pawns; indexed by (pieceIdx - pieceLookupList.length - 1). */
    private promotedPieces: {
        w: BoardPieceName[];
        b: BoardPieceName[];
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

    /** Hot-path helper: piece name only, no object allocation. */
    getPieceNameOnCoords(coords: BoardCoord): BoardPieceName | null {
        return this.getPieceNameAt(coords[0], coords[1]);
    }

    /** True if square is empty. */
    isEmpty(coords: BoardCoord): boolean {
        return this.tiles[coords[0] * 8 + coords[1]] === 0;
    }

    /** True if square is empty. */
    isEmptyAt(row: number, col: number): boolean {
        return this.tiles[row * 8 + col] === 0;
    }

    /** True if square holds a pawn. */
    isPawnAt(row: number, col: number): boolean {
        const idx = this.tiles[row * 8 + col]! & PIECE_INDEX_BIT_MASK;
        return idx >= 9 && idx <= 16;
    }

    /** Piece name at given coordinates. */
    getPieceNameAt(row: number, col: number): BoardPieceName | null {
        const pieceNumber = this.tiles[row * 8 + col]!;
        if (pieceNumber === 0) return null;

        const color: PlayerColor = pieceNumber & COLOR_BIT_MASK ? 'b' : 'w';
        const pieceIdx = pieceNumber & PIECE_INDEX_BIT_MASK;

        return (
            ChessBoard.pieceLookupList[pieceIdx] ??
            this.promotedPieces[color][pieceIdx - ChessBoard.pieceLookupList.length - 1] ??
            null
        );
    }

    /** Piece at given coordinates. */
    getPieceAt(row: number, col: number): ChessPiece | null {
        const name = this.getPieceNameAt(row, col);
        if (name === null) return null;
        const color = this.getPieceColorAt(row, col);
        if (color === null) return null;
        return { name, color };
    }

    /** Piece color at given coordinates. */
    getPieceColorAt(row: number, col: number): PlayerColor | null {
        const pieceNumber = this.tiles[row * 8 + col]!;
        if (pieceNumber === 0) return null;
        return pieceNumber & COLOR_BIT_MASK ? 'b' : 'w';
    }

    /** Returns the king's live `[row, col]` reference (always exactly one king per side). */
    getKingPosition(player: PlayerColor): MutableBoardCoord {
        return this.pieces[player].K[0] ?? [0, 0];
    }

    /**
     * Live position list for a piece token. Used by {@link PieceFinder}.
     * Do not mutate the outer array (push/splice); coordinate values are updated in place.
     */
    getPositionsForToken(player: PlayerColor, token: PieceToken): MutableBoardCoord[] {
        return this.pieces[player].listForToken(token);
    }

    /** Apply a sequence of parsed move/capture/promote actions (tracker path). */
    applyActions(actions: Action[]): void {
        const len = actions.length;
        for (let i = 0; i < len; i += 1) {
            const action = actions[i];
            if (!action) continue;
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

    /** Move piece by name. */
    movePiece(player: PlayerColor, piece: string, from: BoardCoord, to: BoardCoord): void {
        this.moveByToken(player, piece.charCodeAt(0), from, to);
    }

    /**
     * Move using SAN piece token char code ('N'=78, 'P'=80, …).
     * Updates both the tile array and the piece position index in one step.
     */
    moveByToken(player: PlayerColor, tokenChar: number, from: BoardCoord, to: BoardCoord): void {
        const fromIdx = from[0] * 8 + from[1];
        const toIdx = to[0] * 8 + to[1];
        this.tiles[toIdx] = this.tiles[fromIdx]!;
        this.tiles[fromIdx] = 0;
        this.pieces[player].moveByChar(tokenChar, from, to);
    }

    /** Capture piece by name. */
    capturePiece(player: PlayerColor, takenPiece: string, on: BoardCoord): void {
        this.pieces[player === 'w' ? 'b' : 'w'].capture(takenPiece, on);
        this.tiles[on[0] * 8 + on[1]] = 0;
    }

    /**
     * Capture whatever occupies `on`: clear tile, then update the opponent's piece list.
     * Pawns are cleared from tiles only — they are not in {@link PiecePositions}.
     */
    captureAt(player: PlayerColor, on: BoardCoord): void {
        const onIdx = on[0] * 8 + on[1];
        const pieceNumber = this.tiles[onIdx]!;
        if (pieceNumber === 0) return;

        this.tiles[onIdx] = 0;

        const pieceIdx = pieceNumber & PIECE_INDEX_BIT_MASK;
        if (pieceIdx >= 9 && pieceIdx <= 16) return;

        const color: PlayerColor = pieceNumber & COLOR_BIT_MASK ? 'b' : 'w';
        const name =
            ChessBoard.pieceLookupList[pieceIdx] ??
            this.promotedPieces[color][pieceIdx - ChessBoard.pieceLookupList.length - 1];
        if (!name) return;

        this.pieces[player === 'w' ? 'b' : 'w'].captureByChar(name.charCodeAt(0), on);
    }

    /**
     * Replace the pawn on `on` with a promoted piece.
     * Assigns a new tile index beyond the standard lookup table and records the name.
     */
    promotePiece(player: PlayerColor, on: BoardCoord, to: PromotionToken): void {
        const onIdx = on[0] * 8 + on[1];

        const pieceNumber =
            (player === 'w' ? 0b00000000 : COLOR_BIT_MASK) |
            (this.promotedPieces[player].length + ChessBoard.pieceLookupList.length + 1);

        const piecename: PromotedPieceName = `${to}${pieceNumber}`;

        this.promotedPieces[player].push(piecename);
        this.tiles[onIdx] = pieceNumber;
        this.pieces[player].promote(piecename, on);
    }

    /** Reset to starting position without allocating new arrays. */
    reset(): void {
        this.tiles.set(ChessBoard.defaultTiles);
        this.pieces.w.reset();
        this.pieces.b.reset();
        this.promotedPieces.w.length = 0;
        this.promotedPieces.b.length = 0;
    }

    /** Prints the current board position to the console (debug helper). */
    printPosition(): void {
        console.log(this.tiles);
        for (let row = 0; row < 8; row += 1) {
            process.stdout.write(`${8 - row} `);

            for (let col = 0; col < 8; col += 1) {
                const piece = this.getPieceAt(row, col);
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
        if (!action.piece) return;
        this.movePiece(
            action.player,
            action.piece,
            squareToCoords(action.from),
            squareToCoords(action.to),
        );
    }

    private capture(action: CaptureAction): void {
        if (!action.takenPiece) return;
        this.capturePiece(action.player, action.takenPiece, squareToCoords(action.on));
    }

    private promote(action: PromoteAction): void {
        this.promotePiece(action.player, squareToCoords(action.on), action.promotion);
    }
}

export default ChessBoard;
