import { Chessalyzer, TileTracker } from 'chessalyzer.js';

// create basic tile tracker
const tileTracker = new TileTracker();
const tileTracker2 = new TileTracker();

// start a batch analysis for the PGN file at <pathToPgnFile>
// the analysis is saved directly in the 'tileTracker' object
const data = await Chessalyzer.analyzePGN('./pgn/asorted-games.pgn', [
    {
        trackers: [tileTracker],
        config: { cntGames: 2000, filter: (val) => val.Result === '0-1' },
    },
    {
        trackers: [tileTracker2],
        config: { cntGames: 2000, filter: (val) => val.Result === '1-0' },
    },
]);
console.log(data);

// generate a heat map for the data of 'c1' based on your evaluation function
Chessalyzer.printHeatmap(tileTracker.generateHeatmap('PIECE_MOVED_TO_TILE', 'd1'));
Chessalyzer.printHeatmap(tileTracker2.generateHeatmap('PIECE_MOVED_TO_TILE', 'd1'));
Chessalyzer.printHeatmap(
    tileTracker.generateComparisonHeatmap(tileTracker2, 'PIECE_MOVED_TO_TILE', 'd1'),
);
