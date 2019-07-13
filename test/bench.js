/*eslint-disable*/
var fs = require('fs');
const Chessalyzer = require('../lib/chessalyzer');
const { Tracker } = Chessalyzer;

let a = new Tracker.Game();
let b = new Tracker.Piece();
let c = new Tracker.Tile();
let e = new Tracker.Piece();
let f = new Tracker.Tile();

const CustomTracker = require('./CustomTracker');

const nThreadsMax = 6;
const batchSizeMax = 10;

const d = new CustomTracker.CustomGame();
const results = [...Array(nThreadsMax)].map(x => Array(batchSizeMax).fill(0));

// a.profilingActive = true;
// b.profilingActive = true;
// c.profilingActive = true;

(async () => {
	for (let nThreads = 1; nThreads <= nThreadsMax; nThreads += 1) {
		for (let batchSize = 1; batchSize <= batchSizeMax; batchSize += 1) {
			const data = await Chessalyzer.startBatchMultiCore(
				'./test/lichess_db_standard_rated_2013-12.pgn',
				[b, c, e, f],
				{
					cntGames: 150000
					// filter: game => game.WhiteElo > 1800
				},
				batchSize * 1000,
				nThreads
			);
			results[nThreads - 1][batchSize - 1] = data.mps;
		}
	}
	console.log('Done!');
	var file = fs.createWriteStream('array.csv');
	file.on('error', function(err) {
		/* error handling */
	});
	results.forEach(function(v) {
		file.write(v.join(', ') + '\n');
	});
	file.end();
})();
