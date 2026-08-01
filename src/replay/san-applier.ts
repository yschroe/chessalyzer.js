import { squareToCoords } from '#board/board-coords';
import type SanContext from '#replay/san-context';
import { resolveCastle, resolvePawnMove, resolvePieceMove } from '#replay/san-resolver';

/**
 * Apply one SAN on the board without building {@link Action} objects.
 *
 * Used on the replay fast path when no move trackers are attached. Move resolution
 * is shared with {@link SanDecoder} (see `san-resolver.ts`); this class only performs
 * the board mutations and skips tracker-facing allocations.
 */
export default class SanApplier {
    constructor(private readonly ctx: SanContext) {}

    /**
     * Apply one SAN token on the board.
     * Dispatch uses char codes: a–h = pawn, 'O' (79) = castle, else piece letter.
     */
    apply(san: string): void {
        const c = san.charCodeAt(0);
        if (c >= 97) this.applyPawn(san);
        else if (c === 79) this.applyCastle(san);
        else this.applyPiece(san);
    }

    private applyPawn(san: string): void {
        const ctx = this.ctx;
        const player = ctx.activePlayer;
        const board = ctx.board;
        const r = ctx.pawnResolution;
        resolvePawnMove(ctx, san, r);

        if (r.capture) {
            board.captureAt(player, ctx.takenOnBuf);
        }
        board.moveByToken(player, 80 /* P */, ctx.fromBuf, r.to);

        if (r.promotesTo) {
            board.promotePiece(player, r.to, r.promotesTo);
        }
    }

    private applyPiece(san: string): void {
        const ctx = this.ctx;
        const player = ctx.activePlayer;
        const board = ctx.board;
        const r = ctx.pieceResolution;
        resolvePieceMove(ctx, san, r);

        if (r.capture) {
            board.captureAt(player, r.to);
        }
        board.moveByToken(player, r.tokenChar, r.from, r.to);
    }

    /** Castling moves king then rook; squares come from the shared resolver. */
    private applyCastle(san: string): void {
        const player = this.ctx.activePlayer;
        const board = this.ctx.board;
        const r = resolveCastle(san, player);

        board.moveByToken(player, 75 /* K */, squareToCoords(r.kingFrom), squareToCoords(r.kingTo));
        board.moveByToken(player, 82 /* R */, squareToCoords(r.rookFrom), squareToCoords(r.rookTo));
    }
}
