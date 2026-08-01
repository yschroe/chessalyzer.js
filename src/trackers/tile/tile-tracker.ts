import {
    BOARD_INDICES,
    isBoardIndex,
    squareCol,
    squareRow,
    type Square,
} from '#board/board-coords';
import { MoveTracker } from '#trackers/base-tracker';
import HeatmapPresets from '#trackers/heatmaps/tile-heatmaps';
import {
    createTileGrid,
    mergeCellStats,
    setStartingPiece,
    tileCellAt,
} from '#trackers/tile/tile-grid';
import type { TileGrid } from '#trackers/tile/tile-tracker-types';
import type { Action } from '#types/actions';
import type { MoveCoords } from '#types/game';
import type { PlayerColor } from '#types/tokens';

function isTileTracker(tracker: unknown): tracker is TileTracker {
    return (
        typeof tracker === 'object' &&
        tracker !== null &&
        'tiles' in tracker &&
        'movesTotal' in tracker
    );
}

function isCastleRookLeg(action: Action): boolean {
    return (
        action.type === 'move' &&
        action.castle !== undefined &&
        (action.piece === 'Rh' || action.piece === 'Ra')
    );
}

function playerBucket(player: string): PlayerColor | undefined {
    if (player === 'b' || player === 'w') return player;
    return undefined;
}

/**
 * Tracks per-square statistics: moves to, time occupied, captures on, pieces captured on.
 *
 * Maintains a virtual 8×8 grid ({@link StatsField}) parallel to the board replay.
 * Grid allocation/reset/merge lives in `./tile-grid`; this class implements move/capture
 * reaction logic and multithread aggregation.
 */
class TileTracker extends MoveTracker {
    static override readonly trackerId = 'TileTracker';
    static override readonly workerModule = import.meta.url;

    movesGame: number;
    movesTotal: number;
    tiles: TileGrid;

    constructor() {
        super();
        this.heatmapPresets = HeatmapPresets;
        this.movesGame = 0;
        this.movesTotal = 0;
        this.tiles = createTileGrid();
    }

    /** Merge stats from a worker batch tracker into this (main-thread) instance. */
    override merge(tracker: unknown) {
        if (!isTileTracker(tracker)) return;

        this.movesGame += tracker.movesGame;
        this.movesTotal += tracker.movesTotal;

        for (const row of BOARD_INDICES) {
            for (const col of BOARD_INDICES) {
                mergeCellStats(this.tiles[row][col], tracker.tiles[row][col]);
            }
        }
    }

    override trackMoves(data: Action[]) {
        for (const action of data) {
            switch (action.type) {
                case 'move': {
                    if (!isCastleRookLeg(action)) {
                        this.movesGame += 1;
                    }
                    this.processMove(
                        { from: action.from, to: action.to },
                        action.player,
                        action.piece ?? '',
                    );
                    break;
                }
                case 'capture':
                    this.processCapture(
                        action.on,
                        action.player,
                        action.takingPiece ?? '',
                        action.takenPiece ?? '',
                    );
                    break;
                default:
                    break;
            }
        }
    }

    /**
     * End-of-game hook: flush occupation time for pieces still on the board,
     * then reset virtual pieces to the next game's starting layout.
     */
    override onGameEnd() {
        for (const row of BOARD_INDICES) {
            for (const col of BOARD_INDICES) {
                const { currentPiece } = this.tiles[row][col];
                if (currentPiece !== null) {
                    this.addOccupationByRowCol(row, col);
                }
                setStartingPiece(this.tiles, row, col);
            }
        }
        this.movesTotal += this.movesGame;
        this.movesGame = 0;
    }

    /**
     * Record a piece move: credit occupation on `from`, transfer virtual piece to `to`,
     * increment movedTo counters. Skips promoted pawns (names containing digits).
     */
    processMove(move: MoveCoords, player: string, piece: string) {
        const fromRow = squareRow(move.from);
        const fromCol = squareCol(move.from);
        const toRow = squareRow(move.to);
        const toCol = squareCol(move.to);
        const bucket = playerBucket(player);
        if (
            !bucket ||
            !(piece.length > 1 && !piece.match(/\d/g)) ||
            !isBoardIndex(fromRow) ||
            !isBoardIndex(fromCol) ||
            !isBoardIndex(toRow) ||
            !isBoardIndex(toCol)
        ) {
            return;
        }

        this.addOccupation(move.from);

        const fromCell = this.tiles[fromRow][fromCol];
        const toCell = this.tiles[toRow][toCol];
        const movingPiece = fromCell.currentPiece;

        toCell.currentPiece = movingPiece;
        if (movingPiece !== null) {
            movingPiece.lastMovedOn = this.movesGame;
        }
        fromCell.currentPiece = null;

        toCell[bucket].movedTo += 1;
        const pieceBucket = toCell[bucket][piece];
        if (pieceBucket) pieceBucket.movedTo += 1;
    }

    /**
     * Record capture stats on `pos` for taker and taken.
     * Taken piece occupation is flushed before clearing the square.
     */
    processCapture(pos: Square, player: string, takingPiece: string, takenPiece: string): void {
        const cell = tileCellAt(this.tiles, pos);
        const bucket = playerBucket(player);
        if (!cell || !bucket) return;

        if (takenPiece.length > 1 && !takenPiece.match(/\d/g)) {
            const opPlayer: PlayerColor = bucket === 'w' ? 'b' : 'w';
            cell[opPlayer].wasCapturedOn += 1;
            const takenBucket = cell[opPlayer][takenPiece];
            if (takenBucket) takenBucket.wasCapturedOn += 1;

            this.addOccupation(pos);
            cell.currentPiece = null;
        }

        if (takingPiece.length > 1 && !takingPiece.match(/\d/g)) {
            cell[bucket].capturedOn += 1;
            const takingBucket = cell[bucket][takingPiece];
            if (takingBucket) takingBucket.capturedOn += 1;
        }
    }

    /**
     * Add `(movesGame - lastMovedOn)` to wasOn for the piece currently on `pos`.
     * Measures how many half-moves the piece occupied the square since it arrived.
     */
    addOccupation(pos: Square): void {
        this.addOccupationByRowCol(squareRow(pos), squareCol(pos));
    }

    private addOccupationByRowCol(row: number, col: number): void {
        if (!isBoardIndex(row) || !isBoardIndex(col)) return;
        const cell = this.tiles[row][col];
        const { currentPiece } = cell;
        if (currentPiece === null) return;

        const toAdd = this.movesGame - currentPiece.lastMovedOn;
        cell[currentPiece.color].wasOn += toAdd;
        const pieceBucket = cell[currentPiece.color][currentPiece.piece];
        if (pieceBucket) pieceBucket.wasOn += toAdd;
    }
}

export { TileTracker };
