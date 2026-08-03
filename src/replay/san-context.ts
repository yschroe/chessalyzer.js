import ChessBoard from '#board/chess-board';
import PieceFinder from '#replay/piece-finder';
import type { PawnResolution, PieceResolution } from '#replay/san-resolver';
import type { Action, CaptureAction, MoveAction, PromoteAction } from '#types/actions';
import type { PlayerColor } from '#types/tokens';

/**
 * Shared mutable state for replaying one game's SAN moves.
 *
 * Both {@link SanApplier} (board path) and {@link SanDecoder} (tracker path)
 * read/write through this object so coord buffers and the board stay in sync
 * without duplicating construction logic.
 */
export default class SanContext {
    readonly board: ChessBoard;
    readonly pieceFinder: PieceFinder;

    /** Side to move while replaying the current game. Toggled after each SAN. */
    activePlayer: PlayerColor = 'w';

    /** Reused `[row, col]` for the origin square — contents overwritten per move. */
    readonly fromBuf: [number, number] = [0, 0];

    /** Reused for en-passant capture square during decode. */
    readonly takenOnBuf: [number, number] = [0, 0];

    /** Reused pawn resolution scratch for the shared SAN resolver — overwritten per move. */
    readonly pawnResolution: PawnResolution = {
        to: [0, 0],
        capture: false,
        enPassant: false,
        promotesTo: '',
    };

    /** Reused piece resolution scratch for the shared SAN resolver — overwritten per move. */
    readonly pieceResolution: PieceResolution = {
        token: 'K',
        tokenChar: 75,
        to: [0, 0],
        from: [0, 0],
        capture: false,
    };

    // --- Action pools (tracker path). Trackers consume actions synchronously. ---

    readonly moveAction: MoveAction;

    readonly captureAction: CaptureAction;

    readonly promoteAction: PromoteAction;

    /** Cleared (`length = 0`) before each `SanDecoder.decodeSan()` call; same Action objects are pushed back in. */
    readonly outActions: Action[] = [];

    constructor() {
        this.board = new ChessBoard();
        this.pieceFinder = new PieceFinder(this.board);

        this.moveAction = {
            type: 'move',
            san: '',
            player: 'w',
            piece: null,
            from: 'a1',
            to: 'a1',
        };

        this.captureAction = {
            type: 'capture',
            san: '',
            player: 'w',
            on: 'a1',
            takingPiece: null,
            takenPiece: null,
        };

        this.promoteAction = {
            type: 'promote',
            san: '',
            player: 'w',
            on: 'a1',
            promotion: 'Q',
        };
    }

    /** Reset board and side-to-move for a new game. Buffers are not reallocated. */
    reset(): void {
        this.board.reset();
        this.activePlayer = 'w';
    }
}
