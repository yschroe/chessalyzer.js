import { analyzePGN, printHeatmap } from 'chessalyzer.js';
import { TileTracker } from 'chessalyzer.js/trackers';

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

printHeatmap(tileTracker.generateHeatmap('PIECE_MOVED_TO_TILE', 'd1'));
printHeatmap(tileTracker2.generateHeatmap('PIECE_MOVED_TO_TILE', 'd1'));
printHeatmap(tileTracker.generateComparisonHeatmap(tileTracker2, 'PIECE_MOVED_TO_TILE', 'd1'));
