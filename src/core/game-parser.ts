import {
    Action,
    CaptureAction,
    Game,
    GameProcessorAnalysisConfig,
    MoveAction,
    PromoteAction,
} from '../interfaces';
import { PieceToken, PlayerColor } from '../types';
import ChessBoard from './chess-board';
import Utils from './utils';

const moveCfg = {
    Q: {
        line: true,
        diag: true,
    },
    R: {
        line: true,
        diag: false,
    },
    B: {
        line: false,
        diag: true,
    },
    N: {
        line: false,
        diag: false,
    },
};

class MoveNotFoundException extends Error {
    constructor(token: string, player: PlayerColor, tarRow: number, tarCol: number) {
        super(`${player}: No piece for move ${token} to (${tarRow},${tarCol}) found!`);
        this.name = 'MoveNotFoundError';
    }
}

class GameParser {
    board: ChessBoard;
    activePlayer: PlayerColor;

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
    private readonly fromBuf: number[] = [0, 0];
    private readonly takenOnBuf: number[] = [0, 0];
    private readonly filterBuf: number[][] = [];

    constructor() {
        this.board = new ChessBoard();
        this.activePlayer = 'w';
    }

    /**
     * Main function for parsing a read-in PGN game. In here the moves are transformed from algebraic notation
     * to a list of different Actions like `MoveAction` or `CaptureAction`. This parsed data is the passed
     * into the Trackers for generating the stats.
     * @param game A game read-in by the GameProcessor class.
     * @param analysisCfg Trackers into which the parsed data should be passed.
     */
    processGame(game: Game, analysisCfg: GameProcessorAnalysisConfig): void {
        // game based trackers
        for (const tracker of analysisCfg.trackers.game) {
            tracker.analyze(game);
        }

        const { moves } = game;
        const moveTrackers = analysisCfg.trackers.move;
        const hasMoveTrackers = moveTrackers.length > 0;

        this.activePlayer = 'w';
        try {
            for (const move of moves) {
                const currentMoveActions = this.parseMove(move);

                if (hasMoveTrackers) {
                    for (const tracker of moveTrackers) {
                        tracker.analyze(currentMoveActions);
                    }
                }

                this.board.applyActions(currentMoveActions);
                this.activePlayer = this.activePlayer === 'w' ? 'b' : 'w';
            }
        } catch (err) {
            console.log(game);
            this.board.printPosition();
            throw err;
        }

        // notify move trackers that the current game is done
        for (const tracker of moveTrackers) {
            tracker.nextGame?.();
        }

        analysisCfg.processedMoves += moves.length;
        analysisCfg.processedGames += 1;
        this.board.reset();
    }

    /**
     * Resets the board so a new game can be started.
     */
    reset(): void {
        this.board.reset();
        this.activePlayer = 'w';
    }

    /**
     * Main function to parse a single move from algebraic notation to a list of `Action`s.
     * @param rawMove The move in standard algebraic notation.
     * @returns A list of `Action`s to perform on the board.
     */
    private parseMove(san: string): Action[] {
        const c = san.charCodeAt(0);

        // Pawn moves start with file a-h (lowercase).
        if (c >= 97) return this.pawnMove(san);
        if (c === 79) return this.castle(san); // 'O'
        return this.pieceMove(san);
    }

    /**
     * Parses a single pawn move from algebraic notation to a list of `Action`s.
     * @param san The move in standard algebraic notation.
     * @returns A list of `Action`s to perform on the board.
     */
    private pawnMove(san: string): Action[] {
        const actions = this.outActions;
        actions.length = 0;

        const player = this.activePlayer;
        const direction = player === 'w' ? 1 : -1;

        let end = san.length;
        let promotesTo = '';
        if (san.charCodeAt(end - 2) === 61) {
            // '='
            promotesTo = san.charAt(end - 1);
            end -= 2;
        }

        const to = Utils.algebraicToCoordsAt(san, end);
        const from = this.fromBuf;

        // Capture: second char is 'x'
        if (san.charCodeAt(1) === 120) {
            from[0] = to[0] + direction;
            from[1] = san.charCodeAt(0) - 97;

            let offset = 0;
            // en passant
            if (this.board.isEmpty(to)) {
                offset = direction;
            }

            const takenOn = this.takenOnBuf;
            takenOn[0] = to[0] + offset;
            takenOn[1] = to[1];

            const takingPiece = this.board.getPieceNameOnCoords(from);
            const takenPiece = this.board.getPieceNameOnCoords(takenOn);

            const cap = this.captureAction;
            cap.san = san;
            cap.player = player;
            cap.on = takenOn;
            cap.takingPiece = takingPiece;
            cap.takenPiece = takenPiece;
            actions.push(cap);
        } else {
            const tarRow = to[0];
            const tarCol = to[1];

            for (let i = 1; i <= 2; i += 1) {
                const row = tarRow + i * direction;
                const name = this.board.getPieceNameAt(row, tarCol);
                if (name !== null && name.charCodeAt(0) === 80) {
                    // 'P'
                    from[0] = row;
                    from[1] = tarCol;
                    break;
                }
            }
        }

        const piece = this.board.getPieceNameOnCoords(from);

        const mov = this.moveAction;
        mov.san = san;
        mov.player = player;
        mov.piece = piece;
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

    /**
     * Parses a single piece move (KQBNR) from algebraic notation to a list of `Action`s.
     * @param san The move in standard algebraic notation.
     * @returns A list of `Action`s to perform on the board.
     */
    private pieceMove(san: string): Action[] {
        const actions = this.outActions;
        actions.length = 0;
        const player = this.activePlayer;
        const token = san.charAt(0) as PieceToken;

        const xIdx = san.indexOf('x');
        const capture = xIdx !== -1;

        // Target square is always last two characters (tokens like !?+# already stripped).
        const end = san.length;
        const to = Utils.algebraicToCoordsAt(san, end);

        // Rest between piece token and target square, excluding 'x'.
        // san: token + disambiguation? + x? + target
        let restStart = 1;
        let restEnd = end - 2;
        if (capture) {
            // 'x' sits just before the target square in legal SAN
            restEnd = xIdx;
        }
        const restLen = restEnd - restStart;

        let from: number[];
        if (restLen === 2) {
            from = Utils.algebraicToCoordsAt(san, restEnd);
        } else if (restLen === 1) {
            const c = san.charCodeAt(restStart);
            const mustBeInRow = c >= 49 && c <= 56 ? 7 - (c - 49) : null;
            const mustBeInCol = c >= 97 && c <= 104 ? c - 97 : null;
            from = this.findPiece(to, mustBeInRow, mustBeInCol, token, player);
        } else {
            from = this.findPiece(to, null, null, token, player);
        }

        const piece = this.board.getPieceNameOnCoords(from);

        if (capture) {
            const takenPiece = this.board.getPieceNameOnCoords(to);
            const cap = this.captureAction;
            cap.san = san;
            cap.player = player;
            cap.on = to;
            cap.takingPiece = piece;
            cap.takenPiece = takenPiece;
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

    /**
     * Parses a castle move ('O-O' or 'O-O-O') from algebraic notation to a list of `MoveAction`s.
     * @param san The move in standard algebraic notation.
     * @returns A list of `MoveAction`s to perform on the board.
     */
    private castle(san: string): Action[] {
        const actions = this.outActions;
        actions.length = 0;

        const player = this.activePlayer;
        const row = player === 'w' ? 7 : 0;

        // Castling is rare; allocate fresh actions to keep the pooled single-move path simple.
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

    /**
     * Search the current position for a piece that could perform the move.
     */
    private findPiece(
        toPosition: number[],
        mustBeInRow: number | null,
        mustBeInCol: number | null,
        token: PieceToken,
        player: PlayerColor,
    ): number[] {
        const tarRow = toPosition[0];
        const tarCol = toPosition[1];
        const validPieces = this.board.getPositionsForToken(player, token);
        const len = validPieces.length;

        if (len === 1) {
            return validPieces[0];
        }

        const allowedDirections = moveCfg[token as Exclude<PieceToken, 'K'>];
        const filtered = this.filterBuf;
        filtered.length = 0;

        for (let i = 0; i < len; i += 1) {
            const val = validPieces[i];
            const row = val[0];
            const col = val[1];

            if (mustBeInRow !== null && row !== mustBeInRow) continue;
            if (mustBeInCol !== null && col !== mustBeInCol) continue;

            const rowDiff = row > tarRow ? row - tarRow : tarRow - row;
            const colDiff = col > tarCol ? col - tarCol : tarCol - col;

            if (token === 'N') {
                if ((rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2)) {
                    filtered.push(val);
                }
                continue;
            }

            if (
                (allowedDirections.line && (rowDiff === 0 || colDiff === 0)) ||
                (allowedDirections.diag && rowDiff === colDiff)
            ) {
                filtered.push(val);
            }
        }

        if (filtered.length === 1) {
            return filtered[0];
        }

        // else: one of the remaining pieces cannot move because of obstruction or it
        // would result in the king being in check. Find the allowed piece.
        pieceLoop: for (let p = 0; p < filtered.length; p += 1) {
            const piece = filtered[p];
            if (token !== 'N') {
                const dRow = tarRow - piece[0];
                const dCol = tarCol - piece[1];
                const absRow = dRow < 0 ? -dRow : dRow;
                const absCol = dCol < 0 ? -dCol : dCol;
                const steps = absRow > absCol ? absRow : absCol;
                const dirRow = dRow === 0 ? 0 : dRow > 0 ? 1 : -1;
                const dirCol = dCol === 0 ? 0 : dCol > 0 ? 1 : -1;
                for (let i = 1; i < steps; i += 1) {
                    if (!this.board.isEmptyAt(piece[0] + i * dirRow, piece[1] + i * dirCol)) {
                        continue pieceLoop;
                    }
                }
            }

            if (!this.checkCheck(piece, toPosition, player)) {
                return piece;
            }
        }

        throw new MoveNotFoundException(token, player, tarRow, tarCol);
    }

    /**
     * Checks if performing the move would result in the king being in check.
     */
    private checkCheck(from: number[], to: number[], player: PlayerColor): boolean {
        const opColor = player === 'w' ? 'b' : 'w';
        const king = this.board.getPiecePosition(player, 'Ke');

        const diff0 = from[0] - king[0];
        const diff1 = from[1] - king[1];
        let check0: number;
        let check1: number;
        if (diff0 === 0 || diff1 === 0) {
            check0 = 81; // 'Q'
            check1 = 82; // 'R'
        } else if ((diff0 < 0 ? -diff0 : diff0) === (diff1 < 0 ? -diff1 : diff1)) {
            check0 = 81; // 'Q'
            check1 = 66; // 'B'
        } else {
            return false;
        }
        const vertDir = diff0 === 0 ? 0 : diff0 > 0 ? 1 : -1;
        const horzDir = diff1 === 0 ? 0 : diff1 > 0 ? 1 : -1;

        let distanceHorizontal = 8;
        if (horzDir !== 0) {
            distanceHorizontal = horzDir === -1 ? king[1] : 7 - king[1];
        }
        let distanceVertical = 8;
        if (vertDir !== 0) {
            distanceVertical = vertDir === -1 ? king[0] : 7 - king[0];
        }
        const distanceToEdge =
            distanceHorizontal < distanceVertical ? distanceHorizontal : distanceVertical;
        if (distanceToEdge < 2) return false;

        for (let i = 1; i <= distanceToEdge; i += 1) {
            const row = king[0] + i * vertDir;
            const col = king[1] + i * horzDir;

            if (row === to[0] && col === to[1]) break;

            if (row === from[0] && col === from[1]) continue;

            const name = this.board.getPieceNameAt(row, col);
            if (name) {
                if (this.board.getPieceColorAt(row, col) !== opColor) return false;
                const t = name.charCodeAt(0);
                return t === check0 || t === check1;
            }
        }

        return false;
    }
}

export default GameParser;
