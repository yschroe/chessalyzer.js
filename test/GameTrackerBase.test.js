/* eslint-disable no-undef */
import assert from 'assert';
import { Chessalyzer, GameTracker } from '../lib/chessalyzer.js';

context('GameTrackerBase', function () {
	this.timeout(20000);

	describe('Basic Tests: Multithreaded', function () {
		let data;
		let gameTracker = new GameTracker();
		before(async function () {
			data = await Chessalyzer.analyzePGN('./test/asorted_games.pgn', {
				trackers: [gameTracker]
			});
		});

		it('Game count inside Game Tracker matches game count of Parser', function () {
			assert.strictEqual(data.cntGames, gameTracker.cntGames);
		});

		it('Sum of result object matches count of games', function () {
			assert.strictEqual(
				Object.values(gameTracker.results).reduce((a, c) => a + c),
				data.cntGames
			);
		});
	});

	describe('Basic Tests: Singlethreaded', function () {
		let data;
		let gameTracker = new GameTracker();
		before(async function () {
			data = await Chessalyzer.analyzePGN(
				'./test/asorted_games.pgn',
				{ trackers: [gameTracker] },
				null
			);
		});

		it('Game count inside Game Tracker matches game count of Parser', function () {
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
		let gameTracker = new GameTracker();
		before(async function () {
			await Chessalyzer.analyzePGN('./test/asorted_games.pgn', {
				trackers: [gameTracker],
				config: {
					cntGames: 500,
					filter: (game) => game.Result === '1-0'
				}
			});
		});

		it('Win array shows only white wins', function () {
			assert.strictEqual(gameTracker.results.white, 500);
			assert.strictEqual(gameTracker.results.black, 0);
			assert.strictEqual(gameTracker.results.draw, 0);
		});
	});

	describe('ECO Counts', function () {
		let gameTracker = new GameTracker();
		before(async function () {
			await Chessalyzer.analyzePGN('./test/asorted_games.pgn', {
				trackers: [gameTracker]
			});
		});

		it('Counted the ECOs correctly', function () {
			assert.strictEqual(gameTracker.ECO['A00'], 1177);
			assert.strictEqual(gameTracker.ECO['B00'], 632);
			assert.strictEqual(gameTracker.ECO['C00'], 805);
		});
	});
});
