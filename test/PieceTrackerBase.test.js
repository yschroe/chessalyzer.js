/* eslint-disable no-undef */
import assert from 'assert';
import { Chessalyzer, PieceTracker } from '../lib/chessalyzer.js';

context('PieceTrackerBase', function () {
	this.timeout(20000);

	describe('Basic Tests: Multithreaded', function () {
		let pieceTracker = new PieceTracker();
		before(async function () {
			await Chessalyzer.analyzePGN('./test/asorted_games.pgn', {
				trackers: [pieceTracker]
			});
		});

		it('Tracked the correct values', function () {
			assert.strictEqual(pieceTracker.b.Ra.Qd, 631);
		});
	});

	describe('Basic Tests: Singlethreaded', function () {
		let pieceTracker = new PieceTracker();
		before(async function () {
			await Chessalyzer.analyzePGN(
				'./test/asorted_games.pgn',
				{ trackers: [pieceTracker] },
				null
			);
		});

		it('Tracked the correct values', function () {
			assert.strictEqual(pieceTracker.b.Ra.Qd, 631);
		});
	});

	describe('Heatmaps', function () {
		let pieceTracker = new PieceTracker();
		before(async function () {
			await Chessalyzer.analyzePGN('./test/asorted_games.pgn', {
				trackers: [pieceTracker]
			});
		});

		it('Worked with PIECE_CAPTURED preset', function () {
			const data = pieceTracker.generateHeatmap('PIECE_CAPTURED', 'a8');
			// didn't take itself
			assert.strictEqual(data.map[0][0], 0);

			// didn't take anything of same team
			assert.strictEqual(data.map[1][0], 0);

			assert.strictEqual(data.map[7][0], 1514);
		});

		it('Worked with PIECE_CAPTURED_BY preset', function () {
			const data = pieceTracker.generateHeatmap(
				'PIECE_CAPTURED_BY',
				'a8'
			);
			// wasn't taken by itself
			assert.strictEqual(data.map[0][0], 0);

			// wasn't taken by own team
			assert.strictEqual(data.map[1][0], 0);

			assert.strictEqual(data.map[7][0], 1487);
		});

		it('Works with Custom Function', function () {
			let customFunc = (data, loopSqrData, sqrData) => {
				const sqrPiece = sqrData.piece;
				const loopPiece = loopSqrData.piece;
				let val = 0;
				if (
					sqrPiece &&
					loopPiece &&
					loopPiece.color !== sqrPiece.color
				) {
					val = data[loopPiece.color][loopPiece.name][sqrPiece.name];
				}
				return val;
			};
			const data = pieceTracker.generateHeatmap(customFunc, 'a8');
			// wasn't taken by itself
			assert.strictEqual(data.map[0][0], 0);

			// wasn't taken by own team
			assert.strictEqual(data.map[1][0], 0);

			assert.strictEqual(data.map[7][0], 1487);
		});

		it('Throws an error if preset is not found', function () {
			assert.throws(
				() => pieceTracker.generateHeatmap('I_DO_NOT_EXIST', 'a8'),
				Error,
				`Heatmap preset 'I_DO_NOT_EXIST' not found!`
			);
		});
	});
});
