import {
    Action,
    CaptureAction,
    Game,
    GameProcessorAnalysisConfig,
    MoveAction,
    PromoteAction,
} from '../interfaces';
import { PieceToken, PlayerColor } from '../types';
import ChessBoard from '../board/chess-board';
import Utils from '../core/utils';
import PieceFinder from './piece-finder';

/**
 * Replays SAN moves from a pre-tokenized {@link Game} onto a {@link ChessBoard}.
 *
 * Two execution paths:
 * - **Parse-only** (no move trackers): `applySan` updates the board directly — no Action objects.
 * - **Tracker path**: `parseMove` builds Action[] for trackers, then `applyActions` updates the board.
 *
 * The board and reusable buffers persist across games; `processGame` calls `board.reset()` at the end.
 */
class GameParser {
    board: ChessBoard;
    activePlayer: PlayerColor;
    private readonly pieceFinder: PieceFinder;

    // Reused action objects to cut GC pressure (trackers consume them synchronously).
    private readonly moveAction: MoveAction = {
        type: 'move',
        san: '',
        player: 'w',
        piece: '',
        from: [],
        to: [],
    };
    private readonly captureAction: CaptureAction = {
        type: 'capture',
        san: '',
        player: 'w',
        on: [],
        takingPiece: '',
        takenPiece: '',
    };
    private readonly promoteAction: PromoteAction = {
        type: 'promote',
        san: '',
        player: 'w',
        on: [],
        to: '',
    };
    private readonly outActions: Action[] = [];
    /** Shared coord buffer for `from` square — mutated, never allocated per move. */
    private readonly fromBuf: number[] = [0, 0];
    /** Shared coord buffer for en-passant / capture square. */
    private readonly takenOnBuf: number[] = [0, 0];

    constructor() {
        this.board = new ChessBoard();
        this.pieceFinder = new PieceFinder(this.board);
        this.activePlayer = 'w';
    }

    /**
     * Replay all moves in `game`, feed trackers, and update processed counters.
     * @param game Game with `moves[]` already extracted by the PGN line parser.
     * @param analysisCfg Trackers and running processed-game/move counts.
     */
    processGame(game: Game, analysisCfg: GameProcessorAnalysisConfig): void {
        for (const tracker of analysisCfg.trackers.game) {
            tracker.analyze(game);
        }

        const { moves } = game;
        const moveTrackers = analysisCfg.trackers.move;
        const hasMoveTrackers = moveTrackers.length > 0;
        const board = this.board;

        this.activePlayer = 'w';
        try {
            if (hasMoveTrackers) {
                for (let mi = 0; mi < moves.length; mi += 1) {
                    const currentMoveActions = this.parseMove(moves[mi]);
                    for (let ti = 0; ti < moveTrackers.length; ti += 1) {
                        moveTrackers[ti].analyze(currentMoveActions);
                    }
                    board.applyActions(currentMoveActions);
                    this.activePlayer = this.activePlayer === 'w' ? 'b' : 'w';
                }
            } else {
                for (let mi = 0; mi < moves.length; mi += 1) {
                    this.applySan(moves[mi]);
                    this.activePlayer = this.activePlayer === 'w' ? 'b' : 'w';
                }
            }
        } catch (err) {
            console.log(game);
            board.printPosition();
            throw err;
        }

        for (let ti = 0; ti < moveTrackers.length; ti += 1) {
            moveTrackers[ti].nextGame?.();
        }

        analysisCfg.processedMoves += moves.length;
        analysisCfg.processedGames += 1;
        board.reset();
    }

    reset(): void {
        this.board.reset();
        this.activePlayer = 'w';
    }

    /**
     * Dispatch by first character: lowercase a–h = pawn, 'O' = castle, else piece.
     * Char-code checks avoid string prefix allocations.
     */
    private applySan(san: string): void {
        const c = san.charCodeAt(0);
        if (c >= 97) this.applyPawn(san);
        else if (c === 79) this.applyCastle(san);
        else this.applyPiece(san);
    }

    /**
     * Apply a pawn move. SAN forms: `e4`, `exd5`, `exd6 e.p.`-style (empty target = en passant),
     * `e8=Q` promotion. Scans at most two ranks behind the target to find the moving pawn.
     */
    private applyPawn(san: string): void {
        const player = this.activePlayer;
        const direction = player === 'w' ? 1 : -1;
        const board = this.board;

        let end = san.length;
        let promotesTo = '';
        if (san.charCodeAt(end - 2) === 61) {
            // '=' promotion suffix
            promotesTo = san.charAt(end - 1);
            end -= 2;
        }

        const to = Utils.algebraicToCoordsAt(san, end);
        const from = this.fromBuf;

        if (san.charCodeAt(1) === 120) {
            // Capture: `fxe6` or en passant (`exd6` with empty d6)
            from[0] = to[0] + direction;
            from[1] = san.charCodeAt(0) - 97;

            if (board.isEmpty(to)) {
                // En passant: captured pawn is on the adjacent square, not the target.
                this.takenOnBuf[0] = to[0] + direction;
                this.takenOnBuf[1] = to[1];
                board.captureAt(player, this.takenOnBuf);
            } else {
                board.captureAt(player, to);
            }
        } else {
            // Quiet move: walk backward from target (max 2 squares for double push).
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
     * Apply a piece move. Target square is always the last two chars of SAN.
     * Optional `x` immediately before target; disambiguation file/rank in between.
     */
    private applyPiece(san: string): void {
        const player = this.activePlayer;
        const board = this.board;
        const tokenChar = san.charCodeAt(0);
        const token = san.charAt(0) as PieceToken;

        const end = san.length;
        const to = Utils.algebraicToCoordsAt(san, end);

        let restEnd = end - 2;
        let capture = false;
        if (san.charCodeAt(restEnd - 1) === 120) {
            capture = true;
            restEnd -= 1;
        }
        const restLen = restEnd - 1;

        let from: number[];
        if (restLen === 2) {
            // Fully disambiguated: `Nf3`-style with from-square in SAN (rare in practice).
            from = Utils.algebraicToCoordsAt(san, restEnd);
        } else if (restLen === 1) {
            const c = san.charCodeAt(1);
            const mustBeInCol = c >= 97 && c <= 104 ? c - 97 : null;
            const mustBeInRow = c >= 49 && c <= 56 ? 56 - c : null;
            from = this.pieceFinder.findPiece(to, mustBeInRow, mustBeInCol, token, tokenChar, player);
        } else {
            from = this.pieceFinder.findPiece(to, null, null, token, tokenChar, player);
        }

        if (capture) {
            board.captureAt(player, to);
        }
        board.moveByToken(player, tokenChar, from, to);
    }

    /** Apply castling: `O-O` (kingside, san.length === 3) or `O-O-O` (queenside). */
    private applyCastle(san: string): void {
        const player = this.activePlayer;
        const row = player === 'w' ? 7 : 0;
        const board = this.board;
        const from = this.fromBuf;
        const to = this.takenOnBuf;

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

    private parseMove(san: string): Action[] {
        const c = san.charCodeAt(0);

        if (c >= 97) return this.pawnMove(san);
        if (c === 79) return this.castle(san);
        return this.pieceMove(san);
    }

    /** Tracker path: build Action objects for a pawn move (mirrors `applyPawn` logic). */
    private pawnMove(san: string): Action[] {
        const actions = this.outActions;
        actions.length = 0;

        const player = this.activePlayer;
        const direction = player === 'w' ? 1 : -1;
        const board = this.board;

        let end = san.length;
        let promotesTo = '';
        if (san.charCodeAt(end - 2) === 61) {
            promotesTo = san.charAt(end - 1);
            end -= 2;
        }

        const to = Utils.algebraicToCoordsAt(san, end);
        const from = this.fromBuf;

        if (san.charCodeAt(1) === 120) {
            from[0] = to[0] + direction;
            from[1] = san.charCodeAt(0) - 97;

            let offset = 0;
            if (board.isEmpty(to)) {
                offset = direction;
            }

            const takenOn = this.takenOnBuf;
            takenOn[0] = to[0] + offset;
            takenOn[1] = to[1];

            const cap = this.captureAction;
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

        const mov = this.moveAction;
        mov.san = san;
        mov.player = player;
        mov.piece = board.getPieceNameOnCoords(from);
        mov.from = from;
        mov.to = to;
        actions.push(mov);

        if (promotesTo) {
            const promo = this.promoteAction;
            promo.san = san;
            promo.player = player;
            promo.on = to;
            promo.to = promotesTo;
            actions.push(promo);
        }

        return actions;
    }

    /** Tracker path: build Action objects for a piece move (mirrors `applyPiece` logic). */
    private pieceMove(san: string): Action[] {
        const actions = this.outActions;
        actions.length = 0;
        const player = this.activePlayer;
        const board = this.board;
        const tokenChar = san.charCodeAt(0);
        const token = san.charAt(0) as PieceToken;

        const end = san.length;
        const to = Utils.algebraicToCoordsAt(san, end);

        let restEnd = end - 2;
        let capture = false;
        if (san.charCodeAt(restEnd - 1) === 120) {
            capture = true;
            restEnd -= 1;
        }
        const restLen = restEnd - 1;

        let from: number[];
        if (restLen === 2) {
            from = Utils.algebraicToCoordsAt(san, restEnd);
        } else if (restLen === 1) {
            const c = san.charCodeAt(1);
            const mustBeInCol = c >= 97 && c <= 104 ? c - 97 : null;
            const mustBeInRow = c >= 49 && c <= 56 ? 56 - c : null;
            from = this.pieceFinder.findPiece(to, mustBeInRow, mustBeInCol, token, tokenChar, player);
        } else {
            from = this.pieceFinder.findPiece(to, null, null, token, tokenChar, player);
        }

        const piece = board.getPieceNameOnCoords(from);

        if (capture) {
            const cap = this.captureAction;
            cap.san = san;
            cap.player = player;
            cap.on = to;
            cap.takingPiece = piece;
            cap.takenPiece = board.getPieceNameOnCoords(to);
            actions.push(cap);
        }

        const mov = this.moveAction;
        mov.san = san;
        mov.player = player;
        mov.piece = piece;
        mov.from = from;
        mov.to = to;
        actions.push(mov);

        return actions;
    }

    /** Castling produces two move actions (king + rook). Board apply happens after tracker sees both. */
    private castle(san: string): Action[] {
        const actions = this.outActions;
        actions.length = 0;

        const player = this.activePlayer;
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

export default GameParser;
