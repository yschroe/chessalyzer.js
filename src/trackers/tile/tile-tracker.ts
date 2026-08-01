import {
    BOARD_INDICES,
    isBoardIndex,
    squareCol,
    squareRow,
    type Square,
} from '#board/board-coords';
import { defineMoveTracker } from '#trackers/define-tracker';
import { isTrackedPiece } from '#trackers/piece-types';
import {
    createTileGrid,
    mergeCellStats,
    setStartingPiece,
    tileCellAt,
} from '#trackers/tile/tile-grid';
import type { RuntimeTileGrid, TileGrid } from '#trackers/tile/tile-tracker-types';
import type { Action } from '#types/actions';
import type { MoveCoords } from '#types/game';
import type { PlayerColor } from '#types/tokens';
import type { MoveTrackerDef } from '#types/tracker';

/** Public TileTracker result: square counters and total move count (no per-game scratch). */
export interface TileTrackerState {
    tiles: TileGrid;
    movesTotal: number;
}

/** Internal state used while tracking — includes occupation scratch fields. */
interface TileTrackerRuntimeState {
    tiles: RuntimeTileGrid;
    movesTotal: number;
    movesGame: number;
}

function isCastleRookLeg(action: Action): boolean {
    return (
        action.type === 'move' &&
        action.castle !== undefined &&
        (action.piece === 'Rh' || action.piece === 'Ra')
    );
}

/**
 * Add `(movesGame - lastMovedOn)` to wasOn for the piece currently on `pos`.
 * Measures how many half-moves the piece occupied the square since it arrived.
 */
function addOccupation(state: TileTrackerRuntimeState, pos: Square): void {
    addOccupationByRowCol(state, squareRow(pos), squareCol(pos));
}

function addOccupationByRowCol(state: TileTrackerRuntimeState, row: number, col: number): void {
    if (!isBoardIndex(row) || !isBoardIndex(col)) return;
    const cell = state.tiles[row][col];
    const { currentPiece } = cell;
    if (currentPiece === null) return;

    const toAdd = state.movesGame - currentPiece.lastMovedOn;
    const bucket = cell[currentPiece.color];
    bucket.total.wasOn += toAdd;
    if (isTrackedPiece(currentPiece.piece)) {
        bucket.byPiece[currentPiece.piece].wasOn += toAdd;
    }
}

/**
 * Record a piece move: credit occupation on `from`, transfer virtual piece to `to`,
 * increment movedTo counters. Skips promoted pawns (digit-suffixed names).
 */
function processMove(
    state: TileTrackerRuntimeState,
    move: MoveCoords,
    player: PlayerColor,
    piece: string | null | undefined,
): void {
    const fromRow = squareRow(move.from);
    const fromCol = squareCol(move.from);
    const toRow = squareRow(move.to);
    const toCol = squareCol(move.to);
    if (
        !piece ||
        !isTrackedPiece(piece) ||
        !isBoardIndex(fromRow) ||
        !isBoardIndex(fromCol) ||
        !isBoardIndex(toRow) ||
        !isBoardIndex(toCol)
    ) {
        return;
    }

    addOccupation(state, move.from);

    const fromCell = state.tiles[fromRow][fromCol];
    const toCell = state.tiles[toRow][toCol];
    const movingPiece = fromCell.currentPiece;

    toCell.currentPiece = movingPiece;
    if (movingPiece !== null) {
        movingPiece.lastMovedOn = state.movesGame;
    }
    fromCell.currentPiece = null;

    toCell[player].total.movedTo += 1;
    toCell[player].byPiece[piece].movedTo += 1;
}

/**
 * Record capture stats on `pos` for taker and taken.
 * Taken piece occupation is flushed before clearing the square.
 */
function processCapture(
    state: TileTrackerRuntimeState,
    pos: Square,
    player: PlayerColor,
    takingPiece: string | null | undefined,
    takenPiece: string | null | undefined,
): void {
    const cell = tileCellAt(state.tiles, pos);
    if (!cell) return;

    if (takenPiece && isTrackedPiece(takenPiece)) {
        const opPlayer: PlayerColor = player === 'w' ? 'b' : 'w';
        const takenBucket = cell[opPlayer];
        takenBucket.total.wasCapturedOn += 1;
        takenBucket.byPiece[takenPiece].wasCapturedOn += 1;

        addOccupation(state, pos);
        cell.currentPiece = null;
    }

    if (takingPiece && isTrackedPiece(takingPiece)) {
        const takingBucket = cell[player];
        takingBucket.total.capturedOn += 1;
        takingBucket.byPiece[takingPiece].capturedOn += 1;
    }
}

/**
 * Tracks per-square statistics: moves to, time occupied, captures on, pieces captured on.
 *
 * Maintains a virtual 8×8 grid ({@link StatsField}) parallel to the board replay.
 * Grid allocation/reset/merge lives in `./tile-grid`.
 */
const tileTrackerDef = defineMoveTracker<TileTrackerRuntimeState>({
    id: 'TileTracker',

    init: () => ({
        movesGame: 0,
        movesTotal: 0,
        tiles: createTileGrid(),
    }),

    track(state, data) {
        for (const action of data) {
            switch (action.type) {
                case 'move': {
                    if (!isCastleRookLeg(action)) {
                        state.movesGame += 1;
                    }
                    processMove(
                        state,
                        { from: action.from, to: action.to },
                        action.player,
                        action.piece,
                    );
                    break;
                }
                case 'capture':
                    processCapture(
                        state,
                        action.on,
                        action.player,
                        action.takingPiece,
                        action.takenPiece,
                    );
                    break;
                default:
                    break;
            }
        }
    },

    merge(state, other) {
        // movesGame is per-game scratch state; it is always flushed to movesTotal at game end.
        state.movesTotal += other.movesTotal;

        for (const row of BOARD_INDICES) {
            for (const col of BOARD_INDICES) {
                mergeCellStats(state.tiles[row][col], other.tiles[row][col]);
            }
        }
    },

    /**
     * End-of-game hook: flush occupation time for pieces still on the board,
     * then reset virtual pieces to the next game's starting layout.
     */
    onGameEnd(state) {
        for (const row of BOARD_INDICES) {
            for (const col of BOARD_INDICES) {
                const { currentPiece } = state.tiles[row][col];
                if (currentPiece !== null) {
                    addOccupationByRowCol(state, row, col);
                }
                setStartingPiece(state.tiles, row, col);
            }
        }
        state.movesTotal += state.movesGame;
        state.movesGame = 0;
    },
});

/** Public tracker definition — result state is typed without runtime scratch fields. */
export const TileTracker: MoveTrackerDef<TileTrackerState> = tileTrackerDef;
