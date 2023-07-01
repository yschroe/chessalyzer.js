/* eslint-disable no-undef */
import assert from 'assert';
import { Chessalyzer, GameTracker, PieceTracker } from '../lib/chessalyzer.js';

context('Core Features', function () {
	this.timeout(20000);

	const expectedGameCountAsorted = 14630;
	const expectedMoveCountAsorted = 959243;

	context('Basic Parsing', function () {
		describe('PGN File: Multiple Games, No Comments, Single Line for Moves', function () {
			let data;
			before(async function () {
				data = await Chessalyzer.analyzePGN('./test/asorted_games.pgn');
			});

			it('Processed exactly all 14,630 games in file', function () {
				assert.strictEqual(data.cntGames, expectedGameCountAsorted);
			});

			it('Processed exactly all 959,243 moves in file', function () {
				assert.strictEqual(data.cntMoves, 959243);
			});
		});

		describe('PGN File: One Game, With Comments, Multiple Lines for Moves', function () {
			let data;
			before(async function () {
				data = await Chessalyzer.analyzePGN(
					'./test/comments_multiline.pgn'
				);
			});

			it('Processed the 1 game in file', function () {
				assert.strictEqual(data.cntGames, 1);
			});

			it('Processed all 26 moves in file', function () {
				assert.strictEqual(data.cntMoves, 26);
			});
		});

		describe('PGN File: One Game, With Comments, Single Lines for Moves', function () {
			let data;
			before(async function () {
				data = await Chessalyzer.analyzePGN(
					'./test/comments_singleline.pgn'
				);
			});

			it('Processed the 1 game in file', function () {
				assert.strictEqual(data.cntGames, 1);
			});

			it('Processed all 96 moves in file', function () {
				assert.strictEqual(data.cntMoves, 96);
			});
		});
	});
	context('Filtering', function () {
		describe('Count', function () {
			let data;
			before(async function () {
				data = await Chessalyzer.analyzePGN(
					'./test/asorted_games.pgn',
					{ config: { cntGames: 100 } }
				);
			});

			it('Processed exactly 100 games of file', function () {
				assert.strictEqual(data.cntGames, 100);
			});
		});

		describe('Function', function () {
			let data;
			before(async function () {
				data = await Chessalyzer.analyzePGN(
					'./test/asorted_games.pgn',
					{ config: { filter: (game) => game.Result === '1-0' } }
				);
			});

			it('Processed all 7,515 games where white wins in file', function () {
				assert.strictEqual(data.cntGames, 7515);
			});
		});

		describe('Count + Function', function () {
			let data;
			before(async function () {
				data = await Chessalyzer.analyzePGN(
					'./test/asorted_games.pgn',
					{
						config: {
							cntGames: 500,
							filter: (game) => game.Result === '0-1'
						}
					}
				);
			});

			it('Processed 500 games', function () {
				assert.strictEqual(data.cntGames, 500);
			});
		});
	});

	context('Attaching Trackers', function () {
		let gameTracker = new GameTracker();
		let pieceTracker = new PieceTracker();

		describe('Single Tracker', function () {
			let data;
			before(async function () {
				data = await Chessalyzer.analyzePGN(
					'./test/asorted_games.pgn',
					{ trackers: [gameTracker] }
				);
			});

			it('Processed all games without error', function () {
				assert.strictEqual(data.cntGames, expectedGameCountAsorted);
			});
		});

		describe('Single Tracker (in Array)', function () {
			let data;
			before(async function () {
				data = await Chessalyzer.analyzePGN(
					'./test/asorted_games.pgn',
					[{ trackers: [gameTracker] }]
				);
			});

			it('Processed all games without error', function () {
				assert.strictEqual(data.cntGames, expectedGameCountAsorted);
			});
		});

		describe('Multiple Trackers', function () {
			let data;
			before(async function () {
				data = await Chessalyzer.analyzePGN(
					'./test/asorted_games.pgn',
					{ trackers: [gameTracker, pieceTracker] }
				);
			});

			it('Processed all games without error', function () {
				assert.strictEqual(data.cntGames, expectedGameCountAsorted);
			});
		});

		describe('Multiple Trackers with different configs', function () {
			let data;
			before(async function () {
				data = await Chessalyzer.analyzePGN(
					'./test/asorted_games.pgn',
					[
						{
							trackers: [gameTracker],
							config: {
								cntGames: 10000,
								filter: (val) => val.WhiteElo > 1500
							}
						},
						{
							trackers: [pieceTracker],
							config: {
								cntGames: 4000,
								filter: (val) => val.WhiteElo < 1500
							}
						}
					]
				);
			});

			it('Processed the right amount of games', function () {
				assert.strictEqual(data[0].cntGames, 10000);
				assert.strictEqual(data[1].cntGames, 4000);
			});
		});
	});

	context('Other', function () {
		describe('Singlethreaded Mode', function () {
			let data;
			before(async function () {
				data = await Chessalyzer.analyzePGN(
					'./test/asorted_games.pgn',
					undefined,
					null
				);
			});

			it('Processed exactly all 43,364 games in file', function () {
				assert.strictEqual(data.cntGames, expectedGameCountAsorted);
			});

			it('Processed exactly all 2,888,359 moves in file', function () {
				assert.strictEqual(data.cntMoves, expectedMoveCountAsorted);
			});
		});
	});
});
