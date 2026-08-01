import { analyzePGN, getTrackerState, printHeatmap } from 'chessalyzer';
import {
    generateComparisonHeatmap,
    generateHeatmap,
    TileHeatmapPresets,
    TileTracker,
} from 'chessalyzer/trackers';

const data = await analyzePGN('./pgn/asorted-games.pgn', {
    workers: false,
    runs: [
        {
            trackers: [TileTracker],
            maxGames: 2000,
            filter: (game) => game.result === '0-1',
        },
        {
            trackers: [TileTracker],
            maxGames: 2000,
            filter: (game) => game.result === '1-0',
        },
    ],
});
console.log(data);

const state1 = getTrackerState(data, TileTracker, 0);
const state2 = getTrackerState(data, TileTracker, 1);

printHeatmap(generateHeatmap(state1, TileHeatmapPresets.PIECE_MOVED_TO_TILE, { square: 'd1' }));
printHeatmap(generateHeatmap(state2, TileHeatmapPresets.PIECE_MOVED_TO_TILE, { square: 'd1' }));
printHeatmap(
    generateComparisonHeatmap(state1, state2, TileHeatmapPresets.PIECE_MOVED_TO_TILE, {
        square: 'd1',
    }),
);
