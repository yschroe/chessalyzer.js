import { analyzePGN, printHeatmap } from 'chessalyzer';
import { TileTracker, type TileTrackerState } from 'chessalyzer/trackers';

const tileTracker = new TileTracker();
const tileTracker2 = new TileTracker();

const data = await analyzePGN('./pgn/asorted-games.pgn', {
    workers: false,
    runs: [
        {
            trackers: [tileTracker],
            maxGames: 2000,
            filter: (game) => game.result === '0-1',
        },
        {
            trackers: [tileTracker2],
            maxGames: 2000,
            filter: (game) => game.result === '1-0',
        },
    ],
});
console.log(data);

const state1 = data.runs[0]?.trackers[0]?.state as TileTrackerState;
const state2 = data.runs[1]?.trackers[0]?.state as TileTrackerState;

printHeatmap(
    tileTracker.generateHeatmap(state1, { analysis: 'PIECE_MOVED_TO_TILE', square: 'd1' }),
);
printHeatmap(
    tileTracker2.generateHeatmap(state2, { analysis: 'PIECE_MOVED_TO_TILE', square: 'd1' }),
);
printHeatmap(
    tileTracker.generateComparisonHeatmap(state1, state2, {
        analysis: 'PIECE_MOVED_TO_TILE',
        square: 'd1',
    }),
);
