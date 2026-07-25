import { Board } from '#bitboard';

import type { ChessPiece, Action, MoveAction, CaptureAction, PromoteAction } from '../interfaces';
import type { PieceToken, PlayerColor } from '../types';

class PiecePositions {
    private state: (string | null)[];

    constructor() {
        // prettier-ignore
        this.state = [
			'wRh', 'wNg', 'wBf', 'wKe', 'wQd', 'wBc', 'wNb', 'wRa',
			'wPh', 'wPg', 'wPf', 'wPe', 'wPd', 'wPc', 'wPb', 'wPa',
			null,  null,  null,  null,  null,  null,  null,  null,
			null,  null,  null,  null,	null,  null,  null,  null,
			null,  null,  null,  null,  null,  null,  null,  null,  
			null,  null,  null,  null,  null,  null,  null,  null,
			'bPh', 'bPg', 'bPf', 'bPe', 'bPd', 'bPc', 'bPb', 'bPa',
			'bRh', 'bNg', 'bBf', 'bKe', 'bQd', 'bBc', 'bNb', 'bRa'
		]
    }

    get(idx: number) {
        return this.state[idx];
    }

    getAllForToken(player: PlayerColor, token: string) {
        const indexes: number[] = [];

        for (const [idx, cell] of this.state.entries()) {
            if (cell?.startsWith(player) && cell?.includes(token)) indexes.push(idx);
        }
        return indexes;
    }

    move(fromIdx: number, toIdx: number): void {
        this.state[toIdx] = this.state[fromIdx];
        this.state[fromIdx] = null;
    }

    capture(onIdx: number): void {
        this.state[onIdx] = null;
    }

    promote(piece: string, onIdx: number): void {
        this.state[onIdx] = piece;
    }
}

class ChessBoard {
    piecePositions: PiecePositions;
    board: Board;
    promoteCounter: number;

    constructor() {
        this.board = new Board();
        this.reset();
    }

    getPieceOnBitIdx(idx: number): ChessPiece | null {
        const piece = this.piecePositions.get(idx);
        if (!piece) return null;

        return {
            name: piece.slice(-2),
            color: piece.at(0) as PlayerColor,
        };
    }

    getPiecesThatCanMoveToSquare(
        player: PlayerColor,
        token: PieceToken,
        targetIdx: number,
        knownFromParts: number,
    ) {
        return this.board.find_attacker(player, token, targetIdx, knownFromParts);
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
        this.piecePositions = new PiecePositions();
        this.promoteCounter = 0;
        this.board.reset();
    }

    /** Prints the current board position to the console. */
    printPosition(): void {
        for (let row = 0; row < 8; row += 1) {
            // Rank
            process.stdout.write(`${8 - row} `);

            // Board
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

        // Files
        process.stdout.write(`    a    b    c    d    e    f    g    h\n`);
    }

    private move(action: MoveAction): void {
        const { fromIdx, toIdx, piece, player } = action;

        this.piecePositions.move(fromIdx, toIdx);

        const token = piece.at(0) as PieceToken;
        this.board.move_piece(player, token, fromIdx, toIdx);
    }

    private capture(action: CaptureAction): void {
        const { onIdx, player, takenPiece } = action;

        this.piecePositions.capture(onIdx);

        const token = takenPiece.at(0) as PieceToken;
        const otherPlayer = player === 'w' ? 'b' : 'w';
        this.board.capture_piece(otherPlayer, token, onIdx);
    }

    private promote(action: PromoteAction): void {
        const { onIdx, to, player } = action;

        const pieceName = `${player}${to}${this.promoteCounter++}`;
        this.piecePositions.promote(pieceName, onIdx);

        this.board.promote_piece(player, to, onIdx);
    }
}

export default ChessBoard;
