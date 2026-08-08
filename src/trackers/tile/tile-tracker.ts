import {
    BOARD_INDICES,
    isBoardIndex,
    squareCol,
    squareRow,
    type Square,
} from '#board/board-coords';
import { defineMoveTracker } from '#trackers/define-tracker';
import { isStartingPieceName, type PieceName } from '#trackers/piece-types';
import {
    createTileGrid,
    buildSquaresRecord,
    mergeCellStats,
    runtimeTileAt,
    setStartingPiece,
} from '#trackers/tile/tile-grid';
import type { RuntimeTileGrid, SquareStats } from '#trackers/tile/tile-tracker-types';
import type { Action, MoveCoords } from '#types/actions';
import type { PlayerColor } from '#types/tokens';
import type { MoveTrackerDef, TrackerFactory } from '#types/tracker';

/** Accumulated state from {@link tileTracker} after `analyzePGN` completes. */
export interface TileTrackerState {
    /** Per-square counters keyed by algebraic square (`'a1'`…`'h8'`). */
    squares: Record<Square, SquareStats>;
    /** Total half-moves processed across all games. */
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
 * Add `(movesGame - lastMovedOn)` to occupiedFor for the piece currently on `pos`.
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
    bucket.total.occupiedFor += toAdd;
    if (isStartingPieceName(currentPiece.piece)) {
        bucket.byPiece[currentPiece.piece].occupiedFor += toAdd;
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
    piece: PieceName,
): void {
    const fromRow = squareRow(move.from);
    const fromCol = squareCol(move.from);
    const toRow = squareRow(move.to);
    const toCol = squareCol(move.to);
    if (
        !isStartingPieceName(piece) ||
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
    takingPiece: PieceName,
    takenPiece: PieceName,
): void {
    const cell = runtimeTileAt(state.tiles, pos);
    if (!cell) return;

    if (isStartingPieceName(takenPiece)) {
        const opPlayer: PlayerColor = player === 'w' ? 'b' : 'w';
        const takenBucket = cell[opPlayer];
        takenBucket.total.losses += 1;
        takenBucket.byPiece[takenPiece].losses += 1;

        addOccupation(state, pos);
        cell.currentPiece = null;
    }

    if (isStartingPieceName(takingPiece)) {
        const takingBucket = cell[player];
        takingBucket.total.captures += 1;
        takingBucket.byPiece[takingPiece].captures += 1;
    }
}

function toPublicTileState(runtime: TileTrackerRuntimeState): TileTrackerState {
    return {
        squares: buildSquaresRecord(runtime.tiles),
        movesTotal: runtime.movesTotal,
    };
}

/** Replace runtime scratch fields with the public {@link TileTrackerState} shape in place. */
function finalizeTileTrackerState(
    runtime: TileTrackerRuntimeState,
    finished: TileTrackerState,
): void {
    Reflect.deleteProperty(runtime, 'tiles');
    Reflect.deleteProperty(runtime, 'movesGame');
    Object.assign(runtime, finished);
}

/**
 * Built-in move tracker: per-square statistics (moves to, occupation time, captures, losses).
 *
 * Maintains an 8×8 grid parallel to the board. After analysis, read `tiles.state.squares` —
 * runtime scratch fields are converted in `onFinish`.
 */
const tileTrackerFactory = defineMoveTracker<TileTrackerRuntimeState>({
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

    onFinish(state) {
        finalizeTileTrackerState(state, toPublicTileState(state));
    },
});

/**
 * Built-in tile tracker factory — pass `tileTracker()` to {@link analyzePGN}.
 *
 * @example
 * ```ts
 * import { analyzePGN } from 'chessalyzer';
 * import { tileTracker, generateHeatmap, TileHeatmapPresets } from 'chessalyzer/trackers';
 *
 * const tiles = tileTracker();
 * await analyzePGN('games.pgn', { trackers: [tiles] });
 * const heat = generateHeatmap(tiles.state, TileHeatmapPresets.TILE_OCC_ALL);
 * ```
 *
 * The factory is typed against runtime accumulation state; callers only see
 * {@link TileTrackerState} after `onFinish` strips the internal grid.
 */
// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- runtime vs public state shapes differ; onFinish converts in place
export const tileTracker = tileTrackerFactory as unknown as TrackerFactory<
    TileTrackerState,
    unknown,
    MoveTrackerDef<TileTrackerState>
>;
