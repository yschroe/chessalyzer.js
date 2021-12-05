import { Chessalyzer, Tracker } from '../lib/chessalyzer.js';

const a = new Tracker.Game();
const b = new Tracker.Piece();
const c = new Tracker.Tile();

// import CustomTracker from './CustomTracker.js';

// const d = new CustomTracker.CustomGame();

a.cfg.profilingActive = true;
b.cfg.profilingActive = true;
c.cfg.profilingActive = true;

(async () => {
	const header = await Chessalyzer.startBatch(
		'./test/lichess_db_standard_rated_2013-12.pgn',
		[],
		{
			cntGames: 500000
		}
	);
	console.log(
		`${header.cntGames} games (${header.cntMoves} moves) processed (${header.mps} moves/s)`
	);
	console.log('Game: ' + Math.round(a.time) / 1000);
	console.log('Piece: ' + Math.round(b.time) / 1000);
	console.log('Tile: ' + Math.round(c.time) / 1000);
})();
