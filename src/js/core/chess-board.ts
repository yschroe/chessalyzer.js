import { Board } from '#bitboard';

import type { ChessPiece, Action, MoveAction, CaptureAction, PromoteAction } from '../interfaces';
import type { PieceToken, PlayerColor } from '../types';
import Utils from './utils';

/** Stable piece identifiers used by trackers (e.g. `Ra`, `Pe`).
 *  Index order matches bit indices: h-file first (h1=0 … a8=63). */
const STARTING_PIECE_NAMES: (string | null)[] = [
    'Rh', 'Ng', 'Bf', 'Ke', 'Qd', 'Bc', 'Nb', 'Ra', // rank 1 (white)
    'Ph', 'Pg', 'Pf', 'Pe', 'Pd', 'Pc', 'Pb', 'Pa', // rank 2 (white)
    null, null, null, null, null, null, null, null,
    null, null, null, null, null, null, null, null,
    null, null, null, null, null, null, null, null,
    null, null, null, null, null, null, null, null,
    'Ph', 'Pg', 'Pf', 'Pe', 'Pd', 'Pc', 'Pb', 'Pa', // rank 7 (black)
    'Rh', 'Ng', 'Bf', 'Ke', 'Qd', 'Bc', 'Nb', 'Ra', // rank 8 (black)
];

const COLOR_BIT = 256;

class ChessBoard {
    board: Board;
    /** Traveling piece names — bitboards track position, this tracks identity for stats. */
    private pieceNames: (string | null)[];
    private promoteCounter: number;

    constructor() {
        this.board = new Board();
        this.reset();
    }

    getPieceOnBitIdx(idx: number): ChessPiece | null {
        const encoded = this.board.get_piece_at(idx);
        if (encoded === -1) return null;

        const color = (encoded & COLOR_BIT ? 'b' : 'w') as PlayerColor;
        const token = String.fromCharCode(encoded & 0xff);
        const name = this.pieceNames[idx] ?? `${token}${Utils.fileFromBitIndex(idx)}`;

        return { name, color };
    }

    getPiecesThatCanMoveToSquare(
        player: PlayerColor,
        token: PieceToken,
        targetIdx: number,
        knownFromParts: number,
    ) {
        return this.board.find_attacker(player, token, targetIdx, knownFromParts);
    }

    findPawnFromSquare(player: PlayerColor, toIdx: number, captureFile: number | null) {
        return this.board.find_pawn_from(player, toIdx, captureFile ?? -1);
    }

    applyActions(actions: Action[]): void {
        for (const action of actions) {
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

    reset(): void {
        this.pieceNames = STARTING_PIECE_NAMES.slice();
        this.promoteCounter = 0;
        this.board.reset();
    }

    /** Prints the current board position to the console. */
    printPosition(): void {
        for (let row = 0; row < 8; row += 1) {
            process.stdout.write(`${8 - row} `);

            for (let col = 0; col < 8; col += 1) {
                const piece = this.getPieceOnBitIdx(63 - row * 8 - col);
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
        const { fromIdx, toIdx, piece, player } = action;

        this.pieceNames[toIdx] = this.pieceNames[fromIdx];
        this.pieceNames[fromIdx] = null;

        const token = piece.at(0) as PieceToken;
        this.board.move_piece(player, token, fromIdx, toIdx);
    }

    private capture(action: CaptureAction): void {
        const { onIdx, player, takenPiece } = action;

        this.pieceNames[onIdx] = null;

        const token = takenPiece.at(0) as PieceToken;
        const otherPlayer = player === 'w' ? 'b' : 'w';
        this.board.capture_piece(otherPlayer, token, onIdx);
    }

    private promote(action: PromoteAction): void {
        const { onIdx, to, player } = action;

        // Digit suffix marks promoted pieces; PieceTracker skips names matching /\d/.
        this.pieceNames[onIdx] = `${to}${this.promoteCounter++}`;

        this.board.promote_piece(player, to, onIdx);
    }
}

export default ChessBoard;
