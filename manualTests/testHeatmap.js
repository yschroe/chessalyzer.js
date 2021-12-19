import { Chessalyzer, Tracker } from '../lib/chessalyzer.js';

// create basic tile tracker
const tileTracker = new Tracker.Tile();
const tileTracker2 = new Tracker.Tile();

// start a batch analysis for the PGN file at <pathToPgnFile>
// the analysis is saved directly in the 'tileTracker' object
const data = await Chessalyzer.analyzePGN(
	'./test/lichess_db_standard_rated_2013-12.pgn',
	[
		{
			trackers: [tileTracker],
			config: { cntGames: 2000, filter: (val) => val.Result === '0-1' }
		},
		{
			trackers: [tileTracker2],
			config: { cntGames: 2000, filter: (val) => val.Result === '1-0' }
		}
	]
	// null
);
console.log(data);

// generate a heat map for the data of 'c1' based on your evaluation function
Chessalyzer.printHeatmap(
	tileTracker.generateHeatmap('PIECE_MOVED_TO_TILE', 'd1')
);
Chessalyzer.printHeatmap(
	tileTracker2.generateHeatmap('PIECE_MOVED_TO_TILE', 'd1')
);
Chessalyzer.printHeatmap(
	tileTracker.generateComparisonHeatmap(
		tileTracker2,
		'PIECE_MOVED_TO_TILE',
		'd1'
	)
);
