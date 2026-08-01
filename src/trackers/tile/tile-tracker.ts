import {
    BOARD_INDICES,
    isBoardIndex,
    squareCol,
    squareRow,
    type BoardCoord,
    type Square,
} from '#board/board-coords';
import { MoveTracker } from '#trackers/define-tracker';
import {
    generateComparisonHeatmap,
    generateHeatmap,
    resolveHeatmapFunc,
} from '#trackers/heatmap-utils';
import { TileHeatmapPresets, type TileHeatmapPresetName } from '#trackers/heatmaps/tile-heatmaps';
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
import type { HeatmapAnalysisFunc, HeatmapData } from '#types/tracker';

export interface TileTrackerState {
    tiles: TileGrid;
    movesGame: number;
    movesTotal: number;
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
class TileTracker extends MoveTracker<TileTrackerState> {
    override readonly id = 'TileTracker';
    override readonly workerModule = import.meta.url;
    static readonly presets = TileHeatmapPresets;

    init(): TileTrackerState {
        return {
            movesGame: 0,
            movesTotal: 0,
            tiles: createTileGrid(),
        };
    }

    generateHeatmap(
        state: TileTrackerState,
        analysisFunc: TileHeatmapPresetName | HeatmapAnalysisFunc<TileTrackerState>,
        square?: string | BoardCoord,
        optData?: unknown,
    ): HeatmapData {
        return generateHeatmap(
            state,
            resolveHeatmapFunc(TileHeatmapPresets, analysisFunc),
            square,
            optData,
        );
    }

    generateComparisonHeatmap(
        state: TileTrackerState,
        compState: TileTrackerState,
        analysisFunc: TileHeatmapPresetName | HeatmapAnalysisFunc<TileTrackerState>,
        square?: string | BoardCoord,
        optData?: unknown,
    ): HeatmapData {
        return generateComparisonHeatmap(
            state,
            compState,
            resolveHeatmapFunc(TileHeatmapPresets, analysisFunc),
            square,
            optData,
        );
    }

    merge(state: TileTrackerState, other: TileTrackerState): void {
        state.movesGame += other.movesGame;
        state.movesTotal += other.movesTotal;

        for (const row of BOARD_INDICES) {
            for (const col of BOARD_INDICES) {
                mergeCellStats(state.tiles[row][col], other.tiles[row][col]);
            }
        }
    }

    track(state: TileTrackerState, data: Action[]): void {
        for (const action of data) {
            switch (action.type) {
                case 'move': {
                    if (!isCastleRookLeg(action)) {
                        state.movesGame += 1;
                    }
                    this.processMove(
                        state,
                        { from: action.from, to: action.to },
                        action.player,
                        action.piece ?? '',
                    );
                    break;
                }
                case 'capture':
                    this.processCapture(
                        state,
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
    override onGameEnd(state: TileTrackerState): void {
        for (const row of BOARD_INDICES) {
            for (const col of BOARD_INDICES) {
                const { currentPiece } = state.tiles[row][col];
                if (currentPiece !== null) {
                    this.addOccupationByRowCol(state, row, col);
                }
                setStartingPiece(state.tiles, row, col);
            }
        }
        state.movesTotal += state.movesGame;
        state.movesGame = 0;
    }

    /**
     * Record a piece move: credit occupation on `from`, transfer virtual piece to `to`,
     * increment movedTo counters. Skips promoted pawns (names containing digits).
     */
    private processMove(
        state: TileTrackerState,
        move: MoveCoords,
        player: string,
        piece: string,
    ): void {
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

        this.addOccupation(state, move.from);

        const fromCell = state.tiles[fromRow][fromCol];
        const toCell = state.tiles[toRow][toCol];
        const movingPiece = fromCell.currentPiece;

        toCell.currentPiece = movingPiece;
        if (movingPiece !== null) {
            movingPiece.lastMovedOn = state.movesGame;
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
    private processCapture(
        state: TileTrackerState,
        pos: Square,
        player: string,
        takingPiece: string,
        takenPiece: string,
    ): void {
        const cell = tileCellAt(state.tiles, pos);
        const bucket = playerBucket(player);
        if (!cell || !bucket) return;

        if (takenPiece.length > 1 && !takenPiece.match(/\d/g)) {
            const opPlayer: PlayerColor = bucket === 'w' ? 'b' : 'w';
            cell[opPlayer].wasCapturedOn += 1;
            const takenBucket = cell[opPlayer][takenPiece];
            if (takenBucket) takenBucket.wasCapturedOn += 1;

            this.addOccupation(state, pos);
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
    private addOccupation(state: TileTrackerState, pos: Square): void {
        this.addOccupationByRowCol(state, squareRow(pos), squareCol(pos));
    }

    private addOccupationByRowCol(state: TileTrackerState, row: number, col: number): void {
        if (!isBoardIndex(row) || !isBoardIndex(col)) return;
        const cell = state.tiles[row][col];
        const { currentPiece } = cell;
        if (currentPiece === null) return;

        const toAdd = state.movesGame - currentPiece.lastMovedOn;
        cell[currentPiece.color].wasOn += toAdd;
        const pieceBucket = cell[currentPiece.color][currentPiece.piece];
        if (pieceBucket) pieceBucket.wasOn += toAdd;
    }
}

export { TileTracker };
