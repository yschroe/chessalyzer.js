import { MoveTracker } from '#tracker/base-tracker';
import HeatmapPresets from '#tracker/heatmaps/tile-heatmaps';
import {
    createTileGrid,
    mergeCellStats,
    resetTileGrid,
    setStartingPiece,
    tileCellAt,
} from '#tracker/tile/tile-grid';
import { BOARD_INDICES, type BoardIndex, type TileGrid } from '#tracker/tile/tile-tracker-types';
import type { Action } from '#types/actions';
import type { Move } from '#types/game';
import type { PlayerColor } from '#types/tokens';
import type { Tracker } from '#types/tracker';

function isTileTracker(tracker: Tracker): tracker is TileTracker {
    return 'tiles' in tracker && 'cntMovesTotal' in tracker;
}

function isBoardIndex(n: number | undefined): n is BoardIndex {
    return n !== undefined && (n | 0) === n && n >= 0 && n <= 7;
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
    static override workerModule = import.meta.url;

    cntMovesGame: number;
    cntMovesTotal: number;
    tiles: TileGrid;

    constructor() {
        super();
        this.heatmapPresets = HeatmapPresets;
        this.cntMovesGame = 0;
        this.cntMovesTotal = 0;
        this.tiles = createTileGrid();
    }

    /** Merge stats from a worker batch tracker into this (main-thread) instance. */
    override merge(tracker: Tracker) {
        if (!isTileTracker(tracker)) return;

        this.time += tracker.time;
        this.cntMovesGame += tracker.cntMovesGame;
        this.cntMovesTotal += tracker.cntMovesTotal;

        for (const row of BOARD_INDICES) {
            for (const col of BOARD_INDICES) {
                mergeCellStats(this.tiles[row][col], tracker.tiles[row][col]);
            }
        }
    }

    /** Clear per-batch counters and restore grid for worker instance reuse. */
    resetWorkerBatch() {
        this.time = 0;
        this.cntMovesGame = 0;
        this.cntMovesTotal = 0;
        resetTileGrid(this.tiles);
    }

    override trackMoves(data: Action[]) {
        for (const action of data) {
            switch (action.type) {
                case 'move':
                    // TODO: castle is counted as two moves. fix
                    this.cntMovesGame += 1;
                    this.processMove(
                        { from: action.from, to: action.to },
                        action.player,
                        action.piece ?? '',
                    );
                    break;
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
    nextGame() {
        for (const row of BOARD_INDICES) {
            for (const col of BOARD_INDICES) {
                const { currentPiece } = this.tiles[row][col];
                if (currentPiece !== null) {
                    this.addOccupation([row, col]);
                }
                setStartingPiece(this.tiles, row, col);
            }
        }
        this.cntMovesTotal += this.cntMovesGame;
        this.cntMovesGame = 0;
    }

    /**
     * Record a piece move: credit occupation on `from`, transfer virtual piece to `to`,
     * increment movedTo counters. Skips promoted pawns (names containing digits).
     */
    processMove(move: Move, player: string, piece: string) {
        const [fromRow, fromCol] = move.from;
        const [toRow, toCol] = move.to;
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
            movingPiece.lastMovedOn = this.cntMovesGame;
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
    processCapture(pos: number[], player: string, takingPiece: string, takenPiece: string): void {
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
     * Add `(cntMovesGame - lastMovedOn)` to wasOn for the piece currently on `pos`.
     * Measures how many half-moves the piece occupied the square since it arrived.
     */
    addOccupation(pos: number[]): void {
        const cell = tileCellAt(this.tiles, pos);
        if (!cell) return;

        const { currentPiece } = cell;
        if (currentPiece === null) return;

        const toAdd = this.cntMovesGame - currentPiece.lastMovedOn;
        cell[currentPiece.color].wasOn += toAdd;
        const pieceBucket = cell[currentPiece.color][currentPiece.piece];
        if (pieceBucket) pieceBucket.wasOn += toAdd;
    }
}

export default TileTracker;
