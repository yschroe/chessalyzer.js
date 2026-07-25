import type { Action } from '#types/actions';
import type { Move } from '#types/game';
import BaseTracker from '#tracker/base-tracker';
import HeatmapPresets from '#tracker/heatmaps/tile-heatmaps';
import { createTileGrid, mergeCellStats, resetTileGrid, setStartingPiece } from './tile-grid';
import type { StatsField } from './tile-tracker-types';

/**
 * Tracks per-square statistics: moves to, time occupied, captures on, pieces captured on.
 *
 * Maintains a virtual 8×8 grid ({@link StatsField}) parallel to the board replay.
 * Grid allocation/reset/merge lives in `./tile-grid`; this class implements move/capture
 * reaction logic and multithread aggregation.
 */
class TileTrackerBase extends BaseTracker {
    cntMovesGame: number;
    cntMovesTotal: number;
    tiles: StatsField[][];

    constructor() {
        super('move');
        this.heatmapPresets = HeatmapPresets;
        this.cntMovesGame = 0;
        this.cntMovesTotal = 0;
        this.tiles = createTileGrid();
    }

    /** Merge stats from a worker batch tracker into this (main-thread) instance. */
    add(tracker: TileTrackerBase) {
        this.time += tracker.time;
        this.cntMovesGame += tracker.cntMovesGame;
        this.cntMovesTotal += tracker.cntMovesTotal;

        for (let row = 0; row < 8; row += 1) {
            for (let col = 0; col < 8; col += 1) {
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

    track(actions: Action[]) {
        for (const action of actions) {
            switch (action.type) {
                case 'move':
                    // TODO: castle is counted as two moves. fix
                    this.cntMovesGame += 1;
                    this.processMove(
                        { from: action.from, to: action.to },
                        action.player,
                        action.piece,
                    );
                    break;
                case 'capture':
                    this.processCapture(
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
    }

    /**
     * End-of-game hook: flush occupation time for pieces still on the board,
     * then reset virtual pieces to the next game's starting layout.
     */
    nextGame() {
        for (let row = 0; row < 8; row += 1) {
            for (let col = 0; col < 8; col += 1) {
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
        if (piece.length > 1 && !piece.match(/\d/g)) {
            this.addOccupation(move.from);

            this.tiles[move.to[0]][move.to[1]].currentPiece =
                this.tiles[move.from[0]][move.from[1]].currentPiece;
            this.tiles[move.to[0]][move.to[1]].currentPiece!.lastMovedOn = this.cntMovesGame;

            this.tiles[move.from[0]][move.from[1]].currentPiece = null;

            const toCell = this.tiles[move.to[0]][move.to[1]];
            toCell[player as 'b' | 'w'].movedTo += 1;
            toCell[player as 'b' | 'w'][piece].movedTo += 1;
        }
    }

    /**
     * Record capture stats on `pos` for taker and taken.
     * Taken piece occupation is flushed before clearing the square.
     */
    processCapture(pos: number[], player: string, takingPiece: string, takenPiece: string): void {
        const cell = this.tiles[pos[0]][pos[1]];

        if (takenPiece.length > 1 && !takenPiece.match(/\d/g)) {
            const opPlayer = player === 'w' ? 'b' : 'w';
            cell[opPlayer].wasCapturedOn += 1;
            cell[opPlayer][takenPiece].wasCapturedOn += 1;

            this.addOccupation(pos);
            cell.currentPiece = null;
        }

        if (takingPiece.length > 1 && !takingPiece.match(/\d/g)) {
            cell[player as 'b' | 'w'].capturedOn += 1;
            cell[player as 'b' | 'w'][takingPiece].capturedOn += 1;
        }
    }

    /**
     * Add `(cntMovesGame - lastMovedOn)` to wasOn for the piece currently on `pos`.
     * Measures how many half-moves the piece occupied the square since it arrived.
     */
    addOccupation(pos: number[]): void {
        const cell = this.tiles[pos[0]][pos[1]];
        const { currentPiece } = cell;
        const toAdd = this.cntMovesGame - currentPiece!.lastMovedOn;
        cell[currentPiece!.color].wasOn += toAdd;
        cell[currentPiece!.color][currentPiece!.piece].wasOn += toAdd;
    }
}

export default TileTrackerBase;
