import { algebraicToCoordsAt, type BoardCoord, type Square } from '#board/board-coords';
import { ReplayFailure } from '#replay/replay-failure';
import type SanContext from '#replay/san-context';
import type { PieceToken, PlayerColor } from '#types/tokens';

const PIECE_TOKEN_BY_CHAR: Record<number, PieceToken | undefined> = {
    82: 'R',
    78: 'N',
    66: 'B',
    81: 'Q',
    75: 'K',
};

/** Reused result of {@link resolvePawnMove} — contents overwritten per call. */
export interface PawnResolution {
    /** Target square (shared coord-table reference — do not mutate). */
    to: BoardCoord;
    capture: boolean;
    enPassant: boolean;
    /** Promotion piece letter, or '' when the SAN has no promotion suffix. */
    promotesTo: string;
}

/** Reused result of {@link resolvePieceMove} — contents overwritten per call. */
export interface PieceResolution {
    token: PieceToken;
    tokenChar: number;
    /** Target square (shared coord-table reference — do not mutate). */
    to: BoardCoord;
    /** Origin square (live piece-list entry or shared coord-table reference — do not mutate). */
    from: BoardCoord;
    capture: boolean;
}

/**
 * Resolve pawn SAN (`e4`, `exd5`, en passant, `e8=Q`) to origin/target coords.
 *
 * Fills `ctx.fromBuf` (origin) and — on captures — `ctx.takenOnBuf` (captured piece
 * square, which differs from `to` only for en passant). Origin is found by scanning
 * at most two ranks behind the target on the same file.
 */
export function resolvePawnMove(ctx: SanContext, san: string, out: PawnResolution): void {
    const player = ctx.activePlayer;
    const direction = player === 'w' ? 1 : -1;
    const board = ctx.board;

    let end = san.length;
    let promotesTo = '';
    if (san.charCodeAt(end - 2) === 61) {
        promotesTo = san.charAt(end - 1);
        end -= 2;
    }

    const to = algebraicToCoordsAt(san, end);
    const from = ctx.fromBuf;
    const [toRow, toCol] = to;

    let capture = false;
    let enPassant = false;
    if (san.charCodeAt(1) === 120) {
        capture = true;
        from[0] = toRow + direction;
        from[1] = san.charCodeAt(0) - 97;

        const takenOn = ctx.takenOnBuf;
        if (board.isEmpty(to)) {
            enPassant = true;
            takenOn[0] = toRow + direction;
            takenOn[1] = toCol;
        } else {
            takenOn[0] = toRow;
            takenOn[1] = toCol;
        }
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

    out.to = to;
    out.capture = capture;
    out.enPassant = enPassant;
    out.promotesTo = promotesTo;
}

/**
 * Resolve piece SAN (`Nf3`, `Nbd2`, `R1e2`, `Qxe5`, …) to origin/target coords.
 * Target = last two chars; optional `x` before target; file/rank disambiguation
 * is delegated to {@link PieceFinder}.
 */
export function resolvePieceMove(ctx: SanContext, san: string, out: PieceResolution): void {
    const player = ctx.activePlayer;
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

    let from: BoardCoord;
    if (restLen === 2) {
        from = algebraicToCoordsAt(san, restEnd);
    } else if (restLen === 1) {
        const c = san.charCodeAt(1);
        const mustBeInCol = c >= 97 && c <= 104 ? c - 97 : null;
        const mustBeInRow = c >= 49 && c <= 56 ? 56 - c : null;
        from = ctx.pieceFinder.findPiece(to, mustBeInRow, mustBeInCol, token, tokenChar, player);
    } else {
        from = ctx.pieceFinder.findPiece(to, null, null, token, tokenChar, player);
    }

    out.token = token;
    out.tokenChar = tokenChar;
    out.to = to;
    out.from = from;
    out.capture = capture;
}

/** Castle squares for one SAN (`O-O` = kingside, else queenside) and side to move. */
export interface CastleResolution {
    castle: 'kingside' | 'queenside';
    kingFrom: Square;
    kingTo: Square;
    rookFrom: Square;
    rookTo: Square;
}

// oxfmt-ignore
/** Shared castle-square table — returned by reference, never allocate per move. */
const CASTLE_SQUARES: Record<PlayerColor, Record<'kingside' | 'queenside', CastleResolution>> = {
    w: {
        kingside: { castle: 'kingside', kingFrom: 'e1', kingTo: 'g1', rookFrom: 'h1', rookTo: 'f1' },
        queenside: { castle: 'queenside', kingFrom: 'e1', kingTo: 'c1', rookFrom: 'a1', rookTo: 'd1' },
    },
    b: {
        kingside: { castle: 'kingside', kingFrom: 'e8', kingTo: 'g8', rookFrom: 'h8', rookTo: 'f8' },
        queenside: { castle: 'queenside', kingFrom: 'e8', kingTo: 'c8', rookFrom: 'a8', rookTo: 'd8' },
    },
};

/** Resolve castling SAN to king/rook squares. Returns a shared object — do not mutate. */
export function resolveCastle(san: string, player: PlayerColor): CastleResolution {
    return CASTLE_SQUARES[player][san.length === 3 ? 'kingside' : 'queenside'];
}
