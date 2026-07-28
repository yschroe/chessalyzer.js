import ChessBoard from '#board/chess-board';
import PieceFinder from '#replay/piece-finder';
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
    readonly fromBuf: number[] = [0, 0];

    /** Reused for en-passant capture square or as second coord buffer during castling. */
    readonly takenOnBuf: number[] = [0, 0];

    // --- Action pools (tracker path). Trackers consume actions synchronously. ---

    readonly moveAction: MoveAction = {
        type: 'move',
        san: '',
        player: 'w',
        piece: '',
        from: [],
        to: [],
    };

    readonly captureAction: CaptureAction = {
        type: 'capture',
        san: '',
        player: 'w',
        on: [],
        takingPiece: '',
        takenPiece: '',
    };

    readonly promoteAction: PromoteAction = {
        type: 'promote',
        san: '',
        player: 'w',
        on: [],
        to: '',
    };

    /** Cleared (`length = 0`) before each `SanDecoder.decodeSan()` call; same Action objects are pushed back in. */
    readonly outActions: Action[] = [];

    constructor() {
        this.board = new ChessBoard();
        this.pieceFinder = new PieceFinder(this.board);
    }

    /** Reset board and side-to-move for a new game. Buffers are not reallocated. */
    reset(): void {
        this.board.reset();
        this.activePlayer = 'w';
    }
}
