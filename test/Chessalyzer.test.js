import { expect, test, describe } from 'bun:test';
import { Chessalyzer } from '../lib/chessalyzer.js';
describe('Core Features', () => {
    const expectedGameCountAsorted = 14630;
    const expectedMoveCountAsorted = 959243;
    describe('Basic Parsing', function () {
        test('PGN File: Multiple Games, No Comments, Single Line for Moves', async () => {
            const data = (await Chessalyzer.analyzePGN('./test/asorted_games.pgn'));
            expect(data.cntGames).toBe(expectedGameCountAsorted);
            expect(data.cntMoves).toBe(expectedMoveCountAsorted);
        });
        test('PGN File: One Game, With Comments, Multiple Lines for Moves', async () => {
            const data = (await Chessalyzer.analyzePGN('./test/comments_multiline.pgn'));
            expect(data.cntGames).toBe(1);
            expect(data.cntMoves).toBe(26);
        });
        test('PGN File: One Game, With Comments, Single Lines for Moves', async () => {
            const data = (await Chessalyzer.analyzePGN('./test/comments_singleline.pgn'));
            expect(data.cntGames).toBe(1);
            expect(data.cntMoves).toBe(92);
        });
    });
    // describe('Filtering', function () {
    // 	test('Count', function () {
    // 		let data;
    // 		before(async function () {
    // 			data = await Chessalyzer.analyzePGN(
    // 				'./test/asorted_games.pgn',
    // 				{ config: { cntGames: 100 } }
    // 			);
    // 		});
    // 		it('Processed exactly 100 games of file', function () {
    // 			assert.strictEqual(data.cntGames, 100);
    // 		});
    // 	});
    // 	test('Function', function () {
    // 		let data;
    // 		before(async function () {
    // 			data = await Chessalyzer.analyzePGN(
    // 				'./test/asorted_games.pgn',
    // 				{ config: { filter: (game) => game.Result === '1-0' } }
    // 			);
    // 		});
    // 		it('Processed all 7,515 games where white wins in file', function () {
    // 			assert.strictEqual(data.cntGames, 7515);
    // 		});
    // 	});
    // 	test('Count + Function', function () {
    // 		let data;
    // 		before(async function () {
    // 			data = await Chessalyzer.analyzePGN(
    // 				'./test/asorted_games.pgn',
    // 				{
    // 					config: {
    // 						cntGames: 500,
    // 						filter: (game) => game.Result === '0-1'
    // 					}
    // 				}
    // 			);
    // 		});
    // 		it('Processed 500 games', function () {
    // 			assert.strictEqual(data.cntGames, 500);
    // 		});
    // 	});
    // });
    // describe('Attaching Trackers', function () {
    // 	let gameTracker = new GameTracker();
    // 	let pieceTracker = new PieceTracker();
    // 	test('Single Tracker', function () {
    // 		let data;
    // 		before(async function () {
    // 			data = await Chessalyzer.analyzePGN(
    // 				'./test/asorted_games.pgn',
    // 				{ trackers: [gameTracker] }
    // 			);
    // 		});
    // 		it('Processed all games without error', function () {
    // 			assert.strictEqual(data.cntGames, expectedGameCountAsorted);
    // 		});
    // 	});
    // 	test('Single Tracker (in Array)', function () {
    // 		let data;
    // 		before(async function () {
    // 			data = await Chessalyzer.analyzePGN(
    // 				'./test/asorted_games.pgn',
    // 				[{ trackers: [gameTracker] }]
    // 			);
    // 		});
    // 		it('Processed all games without error', function () {
    // 			assert.strictEqual(data.cntGames, expectedGameCountAsorted);
    // 		});
    // 	});
    // 	test('Multiple Trackers', function () {
    // 		let data;
    // 		before(async function () {
    // 			data = await Chessalyzer.analyzePGN(
    // 				'./test/asorted_games.pgn',
    // 				{ trackers: [gameTracker, pieceTracker] }
    // 			);
    // 		});
    // 		it('Processed all games without error', function () {
    // 			assert.strictEqual(data.cntGames, expectedGameCountAsorted);
    // 		});
    // 	});
    // 	test('Multiple Trackers with different configs', function () {
    // 		let data;
    // 		before(async function () {
    // 			data = await Chessalyzer.analyzePGN(
    // 				'./test/asorted_games.pgn',
    // 				[
    // 					{
    // 						trackers: [gameTracker],
    // 						config: {
    // 							cntGames: 10000,
    // 							filter: (val) => val.WhiteElo > 1500
    // 						}
    // 					},
    // 					{
    // 						trackers: [pieceTracker],
    // 						config: {
    // 							cntGames: 4000,
    // 							filter: (val) => val.WhiteElo < 1500
    // 						}
    // 					}
    // 				]
    // 			);
    // 		});
    // 		it('Processed the right amount of games', function () {
    // 			assert.strictEqual(data[0].cntGames, 10000);
    // 			assert.strictEqual(data[1].cntGames, 4000);
    // 		});
    // 	});
    // });
    // describe('Other', function () {
    // 	test('Singlethreaded Mode', function () {
    // 		let data;
    // 		before(async function () {
    // 			data = await Chessalyzer.analyzePGN(
    // 				'./test/asorted_games.pgn',
    // 				undefined,
    // 				null
    // 			);
    // 		});
    // 		it('Processed exactly all 43,364 games in file', function () {
    // 			assert.strictEqual(data.cntGames, expectedGameCountAsorted);
    // 		});
    // 		it('Processed exactly all 2,888,359 moves in file', function () {
    // 			assert.strictEqual(data.cntMoves, expectedMoveCountAsorted);
    // 		});
    // 	});
    // });
});
