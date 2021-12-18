import { Chessalyzer, Tracker, Heatmap } from '../lib/chessalyzer.js';

// create basic tile tracker
const tileTracker = new Tracker.Tile();

// start a batch analysis for the PGN file at <pathToPgnFile>
// the analysis is saved directly in the 'tileTracker' object
await Chessalyzer.startBatch(
	'./test/lichess_db_standard_rated_2013-12.pgn',
	tileTracker,
	{ cntGames: 20000 }
);

// generate a heat map for the data of 'a1' based on your evaluation function
let heatmapData = Chessalyzer.generateHeatmap(
	tileTracker,
	Heatmap.Tile.PIECE_MOVED_TO_TILE.calc,
	'c1'
);

Chessalyzer.printHeatmap(heatmapData.map, heatmapData.min, heatmapData.max);
