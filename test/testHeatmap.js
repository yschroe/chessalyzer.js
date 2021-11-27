import { Chessalyzer, Tracker } from '../lib/chessalyzer.js';

// create basic tile tracker
const tileTracker = new Tracker.Tile();

let fun = (data, _, loopSqrData) => {
	const { coords } = loopSqrData;
	let val = data.tiles[coords[0]][coords[1]].w.wasOn;
	val = (val * 100) / data.cntMovesTotal;
	return val;
};

(async () => {
	// start a batch analysis for the PGN file at <pathToPgnFile>
	// the analysis is saved directly in the 'tileTracker' object
	await Chessalyzer.startBatchMultiCore(
		'./test/lichess_db_standard_rated_2013-12.pgn',
		tileTracker,
		{ cntGames: 20000 }
	);

	// generate a heat map for the data of 'a1' based on your evaluation function
	let heatmapData = Chessalyzer.generateHeatmap(tileTracker, 'a1', fun);
	// let heatmapData = Chessalyzer.generateComparisonHeatmap(
	// 	tileTracker,
	// 	tileTracker,
	// 	'a1',
	// 	fun
	// );

	Chessalyzer.printHeatmap(heatmapData.map, heatmapData.min, heatmapData.max);
})();
