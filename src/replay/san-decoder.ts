import { coordsToSquare, squareAt } from '#board/board-coords';
import { ReplayFailure } from '#replay/replay-failure';
import type SanContext from '#replay/san-context';
import { resolveCastle, resolvePawnMove, resolvePieceMove } from '#replay/san-resolver';
import type { Action } from '#types/actions';
import { isPromotionToken } from '#types/tokens';

/**
 * SAN decode for move trackers — builds reusable {@link Action} objects.
 *
 * Move resolution is shared with {@link SanApplier} (see `san-resolver.ts`); this
 * class populates `moveAction` / `captureAction` / `promoteAction` in the shared
 * {@link SanContext} — the caller applies actions via `board.applyActions()` afterward.
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
        const ctx = this.ctx;
        const actions = ctx.outActions;
        actions.length = 0;

        const player = ctx.activePlayer;
        const board = ctx.board;
        const r = ctx.pawnResolution;
        resolvePawnMove(ctx, san, r);

        const from = ctx.fromBuf;
        const [toRow, toCol] = r.to;

        if (r.capture) {
            const takenOn = ctx.takenOnBuf;
            const cap = ctx.captureAction;
            cap.san = san;
            cap.player = player;
            cap.takingPiece = board.getPieceNameOnCoords(from);
            cap.takenPiece = board.getPieceNameOnCoords(takenOn);
            cap.on = squareAt(takenOn[0], takenOn[1]);
            cap.from = coordsToSquare(from);
            if (r.enPassant) {
                cap.enPassant = true;
            } else {
                delete cap.enPassant;
            }
            actions.push(cap);
        }

        const mov = ctx.moveAction;
        mov.san = san;
        mov.player = player;
        mov.piece = board.getPieceNameOnCoords(from);
        mov.from = coordsToSquare(from);
        mov.to = squareAt(toRow, toCol);
        delete mov.castle;
        actions.push(mov);

        if (r.promotesTo) {
            if (!isPromotionToken(r.promotesTo)) {
                throw new ReplayFailure('UnknownToken', `Unknown promotion piece in SAN: ${san}`);
            }
            const promo = ctx.promoteAction;
            promo.san = san;
            promo.player = player;
            promo.on = squareAt(toRow, toCol);
            promo.promotion = r.promotesTo;
            actions.push(promo);
        }

        return actions;
    }

    /** Build capture (optional) + move actions for a piece SAN. */
    private pieceMove(san: string): Action[] {
        const ctx = this.ctx;
        const actions = ctx.outActions;
        actions.length = 0;

        const player = ctx.activePlayer;
        const board = ctx.board;
        const r = ctx.pieceResolution;
        resolvePieceMove(ctx, san, r);

        const from = r.from;
        const to = r.to;
        const piece = board.getPieceNameOnCoords(from);
        const [fromRow, fromCol] = from;
        const [toRow, toCol] = to;

        if (r.capture) {
            const cap = ctx.captureAction;
            cap.san = san;
            cap.player = player;
            cap.on = squareAt(toRow, toCol);
            cap.takingPiece = piece;
            cap.takenPiece = board.getPieceNameOnCoords(to);
            cap.from = squareAt(fromRow, fromCol);
            delete cap.enPassant;
            actions.push(cap);
        }

        const mov = ctx.moveAction;
        mov.san = san;
        mov.player = player;
        mov.piece = piece;
        mov.from = squareAt(fromRow, fromCol);
        mov.to = squareAt(toRow, toCol);
        delete mov.castle;
        actions.push(mov);

        return actions;
    }

    /**
     * Castling yields two move actions (king + rook).
     * New array literals here are intentional — castling is rare and trackers need distinct `from`/`to`.
     */
    private castle(san: string): Action[] {
        const ctx = this.ctx;
        const actions = ctx.outActions;
        actions.length = 0;

        const player = ctx.activePlayer;
        const r = resolveCastle(san, player);

        actions.push(
            {
                type: 'move',
                san,
                player,
                piece: 'Ke',
                from: r.kingFrom,
                to: r.kingTo,
                castle: r.castle,
            },
            {
                type: 'move',
                san,
                player,
                piece: r.castle === 'kingside' ? 'Rh' : 'Ra',
                from: r.rookFrom,
                to: r.rookTo,
                castle: r.castle,
            },
        );

        return actions;
    }
}
