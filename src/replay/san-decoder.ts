import { algebraicToCoordsAt, coordsToSquare } from '#board/board-coords';
import { ReplayFailure } from '#replay/replay-failure';
import type SanContext from '#replay/san-context';
import type { Action } from '#types/actions';
import type { PieceToken } from '#types/tokens';
import { isPromotionToken } from '#types/tokens';

const PIECE_TOKEN_BY_CHAR: Record<number, PieceToken | undefined> = {
    82: 'R',
    78: 'N',
    66: 'B',
    81: 'Q',
    75: 'K',
};

/**
 * SAN decode for move trackers — builds reusable {@link Action} objects.
 *
 * Logic mirrors {@link SanApplier} but populates `moveAction` / `captureAction` /
 * `promoteAction` in the shared {@link SanContext} instead of mutating the board
 * directly — the caller applies actions via `board.applyActions()` afterward.
 */
export default class SanDecoder {
    constructor(private readonly ctx: SanContext) {}

    /**
     * Decode one SAN token into a (possibly empty-then-filled) Action array.
     * Returns the same `outActions` buffer each call; do not retain across moves.
     */
    decodeSan(san: string): Action[] {
        const c = san.charCodeAt(0);

        if (c >= 97) return this.pawnMove(san);
        if (c === 79) return this.castle(san);
        return this.pieceMove(san);
    }

    /** Build capture + move (+ optional promote) actions for a pawn SAN. */
    private pawnMove(san: string): Action[] {
        const actions = this.ctx.outActions;
        actions.length = 0;

        const player = this.ctx.activePlayer;
        const direction = player === 'w' ? 1 : -1;
        const board = this.ctx.board;

        let end = san.length;
        let promotesTo = '';
        if (san.charCodeAt(end - 2) === 61) {
            promotesTo = san.charAt(end - 1);
            end -= 2;
        }

        const to = algebraicToCoordsAt(san, end);
        const from = this.ctx.fromBuf;
        const [toRow, toCol] = to;

        if (san.charCodeAt(1) === 120) {
            from[0] = toRow + direction;
            from[1] = san.charCodeAt(0) - 97;

            let offset = 0;
            if (board.isEmpty(to)) {
                offset = direction;
            }

            const takenOn = this.ctx.takenOnBuf;
            takenOn[0] = toRow + offset;
            takenOn[1] = toCol;

            const cap = this.ctx.captureAction;
            cap.san = san;
            cap.player = player;
            cap.takingPiece = board.getPieceNameOnCoords(from);
            cap.takenPiece = board.getPieceNameOnCoords(takenOn);
            cap.on = coordsToSquare(takenOn[0], takenOn[1]);
            cap.from = coordsToSquare(from[0], from[1]);
            if (offset !== 0) {
                cap.enPassant = true;
            } else {
                delete cap.enPassant;
            }
            actions.push(cap);
        } else {
            for (let i = 1; i <= 2; i += 1) {
                const row = toRow + i * direction;
                if (board.isPawnAt(row, toCol)) {
                    from[0] = row;
                    from[1] = toCol;
                    break;
                }
            }
        }

        const mov = this.ctx.moveAction;
        mov.san = san;
        mov.player = player;
        mov.piece = board.getPieceNameOnCoords(from);
        mov.from = coordsToSquare(from[0], from[1]);
        mov.to = coordsToSquare(toRow, toCol);
        delete mov.castle;
        actions.push(mov);

        if (promotesTo) {
            if (!isPromotionToken(promotesTo)) {
                throw new ReplayFailure(
                    'UnknownToken',
                    `Unknown promotion piece in SAN: ${san}`,
                );
            }
            const promo = this.ctx.promoteAction;
            promo.san = san;
            promo.player = player;
            promo.on = coordsToSquare(toRow, toCol);
            promo.promotion = promotesTo;
            actions.push(promo);
        }

        return actions;
    }

    /** Build capture (optional) + move actions for a piece SAN. */
    private pieceMove(san: string): Action[] {
        const actions = this.ctx.outActions;
        actions.length = 0;
        const player = this.ctx.activePlayer;
        const board = this.ctx.board;
        const tokenChar = san.charCodeAt(0);
        const token = PIECE_TOKEN_BY_CHAR[tokenChar];
        if (!token) {
            throw new ReplayFailure('UnknownToken', `Unknown piece token in SAN: ${san}`);
        }

        const end = san.length;
        const to = algebraicToCoordsAt(san, end);

        let restEnd = end - 2;
        let capture = false;
        if (san.charCodeAt(restEnd - 1) === 120) {
            capture = true;
            restEnd -= 1;
        }
        const restLen = restEnd - 1;

        let from;
        if (restLen === 2) {
            from = algebraicToCoordsAt(san, restEnd);
        } else if (restLen === 1) {
            const c = san.charCodeAt(1);
            const mustBeInCol = c >= 97 && c <= 104 ? c - 97 : null;
            const mustBeInRow = c >= 49 && c <= 56 ? 56 - c : null;
            from = this.ctx.pieceFinder.findPiece(
                to,
                mustBeInRow,
                mustBeInCol,
                token,
                tokenChar,
                player,
            );
        } else {
            from = this.ctx.pieceFinder.findPiece(to, null, null, token, tokenChar, player);
        }

        const piece = board.getPieceNameOnCoords(from);
        const [fromRow, fromCol] = from;
        const [toRow, toCol] = to;

        if (capture) {
            const cap = this.ctx.captureAction;
            cap.san = san;
            cap.player = player;
            cap.on = coordsToSquare(toRow, toCol);
            cap.takingPiece = piece;
            cap.takenPiece = board.getPieceNameOnCoords(to);
            cap.from = coordsToSquare(fromRow, fromCol);
            delete cap.enPassant;
            actions.push(cap);
        }

        const mov = this.ctx.moveAction;
        mov.san = san;
        mov.player = player;
        mov.piece = piece;
        mov.from = coordsToSquare(fromRow, fromCol);
        mov.to = coordsToSquare(toRow, toCol);
        delete mov.castle;
        actions.push(mov);

        return actions;
    }

    /**
     * Castling yields two move actions (king + rook).
     * New array literals here are intentional — castling is rare and trackers need distinct `from`/`to`.
     */
    private castle(san: string): Action[] {
        const actions = this.ctx.outActions;
        actions.length = 0;

        const player = this.ctx.activePlayer;

        if (player === 'w') {
            if (san.length === 3) {
                actions.push(
                    {
                        type: 'move',
                        san,
                        player,
                        piece: 'Ke',
                        from: 'e1',
                        to: 'g1',
                        castle: 'kingside',
                    },
                    {
                        type: 'move',
                        san,
                        player,
                        piece: 'Rh',
                        from: 'h1',
                        to: 'f1',
                        castle: 'kingside',
                    },
                );
            } else {
                actions.push(
                    {
                        type: 'move',
                        san,
                        player,
                        piece: 'Ke',
                        from: 'e1',
                        to: 'c1',
                        castle: 'queenside',
                    },
                    {
                        type: 'move',
                        san,
                        player,
                        piece: 'Ra',
                        from: 'a1',
                        to: 'd1',
                        castle: 'queenside',
                    },
                );
            }
        } else if (san.length === 3) {
            actions.push(
                {
                    type: 'move',
                    san,
                    player,
                    piece: 'Ke',
                    from: 'e8',
                    to: 'g8',
                    castle: 'kingside',
                },
                {
                    type: 'move',
                    san,
                    player,
                    piece: 'Rh',
                    from: 'h8',
                    to: 'f8',
                    castle: 'kingside',
                },
            );
        } else {
            actions.push(
                {
                    type: 'move',
                    san,
                    player,
                    piece: 'Ke',
                    from: 'e8',
                    to: 'c8',
                    castle: 'queenside',
                },
                {
                    type: 'move',
                    san,
                    player,
                    piece: 'Ra',
                    from: 'a8',
                    to: 'd8',
                    castle: 'queenside',
                },
            );
        }

        return actions;
    }
}
