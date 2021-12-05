/* eslint-disable no-undef */
import assert from 'assert';
import { Chessalyzer, Tracker } from '../lib/chessalyzer.js';

context('GameTrackerBase', function () {
	describe('Basic Tests', function () {
		this.timeout(20000);

		let data;
		let gameTracker = new Tracker.Game();
		before(async function () {
			data = await Chessalyzer.startBatch(
				'./test/lichess_db_standard_rated_2013-01_min.pgn',
				[gameTracker]
			);
		});

		it('Game count inside Game Tracker matches game count of parser', function () {
			assert.strictEqual(data.cntGames, gameTracker.cntGames);
		});

		it('Sum of result object matches count of games', function () {
			assert.strictEqual(
				Object.values(gameTracker.results).reduce((a, c) => a + c),
				data.cntGames
			);
		});
	});

	describe('Filtered Games: Result 1-0', function () {
		this.timeout(20000);

		let gameTracker = new Tracker.Game();
		before(async function () {
			await Chessalyzer.startBatch(
				'./test/lichess_db_standard_rated_2013-01_min.pgn',
				[gameTracker],
				{ cntGames: 500, filter: (game) => game.Result === '1-0' }
			);
		});

		it('Win array shows only white wins', function () {
			assert.strictEqual(gameTracker.results.white, 500);
			assert.strictEqual(gameTracker.results.black, 0);
			assert.strictEqual(gameTracker.results.draw, 0);
		});
	});
});
