/* eslint-disable no-undef */
import assert from 'assert';
import { Chessalyzer, Tracker } from '../lib/chessalyzer.js';

context('PieceTrackerBase', function () {
	this.timeout(20000);

	describe('Basic Tests: Multithreaded', function () {
		let pieceTracker = new Tracker.Piece();
		before(async function () {
			await Chessalyzer.analyzePGN(
				'./test/lichess_db_standard_rated_2013-01_min.pgn',
				pieceTracker
			);
		});

		it('Tracked the correct values', function () {
			assert.strictEqual(pieceTracker.b.Ra.Qd, 1930);
		});
	});

	describe('Basic Tests: Singlethreaded', function () {
		let pieceTracker = new Tracker.Piece();
		before(async function () {
			await Chessalyzer.analyzePGN(
				'./test/lichess_db_standard_rated_2013-01_min.pgn',
				pieceTracker,
				undefined,
				null
			);
		});

		it('Tracked the correct values', function () {
			assert.strictEqual(pieceTracker.b.Ra.Qd, 1930);
		});
	});

	describe('Heatmaps', function () {
		let pieceTracker = new Tracker.Piece();
		before(async function () {
			await Chessalyzer.analyzePGN(
				'./test/lichess_db_standard_rated_2013-01_min.pgn',
				pieceTracker
			);
		});

		it('Worked with PIECE_KILLED', function () {
			const data = pieceTracker.generateHeatmap('PIECE_KILLED', 'a8');
			// didn't take itself
			assert.strictEqual(data.map[0][0], 0);

			// didn't take anything of same team
			assert.strictEqual(data.map[1][0], 0);

			assert.strictEqual(data.map[7][0], 4510);
		});

		it('Worked with PIECE_KILLED_BY', function () {
			const data = pieceTracker.generateHeatmap('PIECE_KILLED_BY', 'a8');
			// wasn't taken by itself
			assert.strictEqual(data.map[0][0], 0);

			// wasn't taken by own team
			assert.strictEqual(data.map[1][0], 0);

			assert.strictEqual(data.map[7][0], 4603);
		});
	});
});
