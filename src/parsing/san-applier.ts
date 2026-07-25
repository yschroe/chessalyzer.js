import { algebraicToCoordsAt } from '#board/board-coords';
import type SanContext from '#parsing/san-context';
import type { PieceToken } from '#types/tokens';

/**
 * Applies SAN moves directly to the board without building {@link Action} objects.
 *
 * Used on the parse-only fast path when no move trackers are attached. Each method
 * mirrors the corresponding logic in {@link SanParser} but skips tracker-facing allocations.
 */
export default class SanApplier {
    constructor(private readonly ctx: SanContext) {}

    /**
     * Apply one SAN token to the board.
     * Dispatch uses char codes: a–h = pawn, 'O' (79) = castle, else piece letter.
     */
    apply(san: string): void {
        const c = san.charCodeAt(0);
        if (c >= 97) this.applyPawn(san);
        else if (c === 79) this.applyCastle(san);
        else this.applyPiece(san);
    }

    /**
     * Pawn SAN: `e4`, `exd5`, en passant (empty target square), `e8=Q`.
     * Origin is found by scanning at most two ranks behind the target on the same file.
     */
    private applyPawn(san: string): void {
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

            if (board.isEmpty(to)) {
                this.ctx.takenOnBuf[0] = to[0] + direction;
                this.ctx.takenOnBuf[1] = to[1];
                board.captureAt(player, this.ctx.takenOnBuf);
            } else {
                board.captureAt(player, to);
            }
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

        board.moveByToken(player, 80 /* P */, from, to);

        if (promotesTo) {
            board.promotePiece(player, to, promotesTo);
        }
    }

    /**
     * Piece SAN: target = last two chars; optional `x` before target;
     * file/rank disambiguation delegated to {@link PieceFinder}.
     */
    private applyPiece(san: string): void {
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

        if (capture) {
            board.captureAt(player, to);
        }
        board.moveByToken(player, tokenChar, from, to);
    }

    /** Castling: `O-O` (san.length === 3) = kingside, else queenside. Moves king then rook. */
    private applyCastle(san: string): void {
        const player = this.ctx.activePlayer;
        const row = player === 'w' ? 7 : 0;
        const board = this.ctx.board;
        const from = this.ctx.fromBuf;
        const to = this.ctx.takenOnBuf;

        from[0] = row;
        from[1] = 4;
        to[0] = row;

        if (san.length === 3) {
            to[1] = 6;
            board.moveByToken(player, 75 /* K */, from, to);
            from[1] = 7;
            to[1] = 5;
            board.moveByToken(player, 82 /* R */, from, to);
        } else {
            to[1] = 2;
            board.moveByToken(player, 75 /* K */, from, to);
            from[1] = 0;
            to[1] = 3;
            board.moveByToken(player, 82 /* R */, from, to);
        }
    }
}
