import type { Action } from '../interfaces';
import type { PieceToken } from '../types';
import { algebraicToCoordsAt } from '../board/board-coords';
import type SanContext from './san-context';

/**
 * Parses SAN into reusable {@link Action} objects for move trackers.
 *
 * Logic mirrors {@link SanApplier} but populates `moveAction` / `captureAction` /
 * `promoteAction` in the shared {@link SanContext} instead of mutating the board
 * directly — the caller applies actions via `board.applyActions()` afterward.
 */
export default class SanParser {
    constructor(private readonly ctx: SanContext) {}

    /**
     * Parse one SAN token into a (possibly empty-then-filled) Action array.
     * Returns the same `outActions` buffer each call; do not retain across moves.
     */
    parse(san: string): Action[] {
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

        if (san.charCodeAt(1) === 120) {
            from[0] = to[0] + direction;
            from[1] = san.charCodeAt(0) - 97;

            let offset = 0;
            if (board.isEmpty(to)) {
                offset = direction;
            }

            const takenOn = this.ctx.takenOnBuf;
            takenOn[0] = to[0] + offset;
            takenOn[1] = to[1];

            const cap = this.ctx.captureAction;
            cap.san = san;
            cap.player = player;
            cap.on = takenOn;
            cap.takingPiece = board.getPieceNameOnCoords(from);
            cap.takenPiece = board.getPieceNameOnCoords(takenOn);
            actions.push(cap);
        } else {
            const tarRow = to[0];
            const tarCol = to[1];

            for (let i = 1; i <= 2; i += 1) {
                const row = tarRow + i * direction;
                if (board.isPawnAt(row, tarCol)) {
                    from[0] = row;
                    from[1] = tarCol;
                    break;
                }
            }
        }

        const mov = this.ctx.moveAction;
        mov.san = san;
        mov.player = player;
        mov.piece = board.getPieceNameOnCoords(from);
        mov.from = from;
        mov.to = to;
        actions.push(mov);

        if (promotesTo) {
            const promo = this.ctx.promoteAction;
            promo.san = san;
            promo.player = player;
            promo.on = to;
            promo.to = promotesTo;
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
        const token = san.charAt(0) as PieceToken;

        const end = san.length;
        const to = algebraicToCoordsAt(san, end);

        let restEnd = end - 2;
        let capture = false;
        if (san.charCodeAt(restEnd - 1) === 120) {
            capture = true;
            restEnd -= 1;
        }
        const restLen = restEnd - 1;

        let from: number[];
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

        if (capture) {
            const cap = this.ctx.captureAction;
            cap.san = san;
            cap.player = player;
            cap.on = to;
            cap.takingPiece = piece;
            cap.takenPiece = board.getPieceNameOnCoords(to);
            actions.push(cap);
        }

        const mov = this.ctx.moveAction;
        mov.san = san;
        mov.player = player;
        mov.piece = piece;
        mov.from = from;
        mov.to = to;
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
        const row = player === 'w' ? 7 : 0;

        if (san.length === 3) {
            actions.push(
                { type: 'move', san, player, piece: 'Ke', from: [row, 4], to: [row, 6] },
                { type: 'move', san, player, piece: 'Rh', from: [row, 7], to: [row, 5] },
            );
        } else {
            actions.push(
                { type: 'move', san, player, piece: 'Ke', from: [row, 4], to: [row, 2] },
                { type: 'move', san, player, piece: 'Ra', from: [row, 0], to: [row, 3] },
            );
        }

        return actions;
    }
}
