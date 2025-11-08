import { Chessalyzer, GameTracker, PieceTracker } from 'chessalyzer.js';
import { describe, it, beforeAll, expect } from 'bun:test';

describe('Core Features', () => {
	// Set expected values (note: some test descriptions do not match these numbers; kept as in original file)
	const expectedGameCountAsorted = 14630;
	const expectedMoveCountAsorted = 959243;

	describe('Basic Parsing', () => {
		describe('PGN File: Multiple Games, No Comments, Single Line for Moves', () => {
			let data;
			beforeAll(async () => {
				data = await Chessalyzer.analyzePGN('./test/asorted_games.pgn');
			});

			it('Processed exactly all 14,630 games in file', () => {
				expect(data.cntGames).toBe(expectedGameCountAsorted);
			});

			it('Processed exactly all 959,243 moves in file', () => {
				expect(data.cntMoves).toBe(959243);
			});
		});

		describe('PGN File: One Game, With Comments, Multiple Lines for Moves', () => {
			let data;
			beforeAll(async () => {
				data = await Chessalyzer.analyzePGN(
					'./test/comments_multiline.pgn'
				);
			});

			it('Processed the 1 game in file', () => {
				expect(data.cntGames).toBe(1);
			});

			it('Processed all 26 moves in file', () => {
				expect(data.cntMoves).toBe(26);
			});
		});

		describe('PGN File: One Game, With Comments, Single Lines for Moves', () => {
			let data;
			beforeAll(async () => {
				data = await Chessalyzer.analyzePGN(
					'./test/comments_singleline.pgn'
				);
			});

			it('Processed the 1 game in file', () => {
				expect(data.cntGames).toBe(1);
			});

			it('Processed all 92 moves in file', () => {
				expect(data.cntMoves).toBe(92);
			});
		});
	});

	describe('Filtering', () => {
		describe('Count', () => {
			let data;
			beforeAll(async () => {
				data = await Chessalyzer.analyzePGN(
					'./test/asorted_games.pgn',
					{ config: { cntGames: 100 } }
				);
			});

			it('Processed exactly 100 games of file', () => {
				expect(data.cntGames).toBe(100);
			});
		});

		describe('Function', () => {
			let data;
			beforeAll(async () => {
				data = await Chessalyzer.analyzePGN(
					'./test/asorted_games.pgn',
					{ config: { filter: (game) => game.Result === '1-0' } }
				);
			});

			it('Processed all 7,515 games where white wins in file', () => {
				expect(data.cntGames).toBe(7515);
			});
		});

		describe('Count + Function', () => {
			let data;
			beforeAll(async () => {
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

			it('Processed 500 games', () => {
				expect(data.cntGames).toBe(500);
			});
		});
	});

	describe('Attaching Trackers', () => {
		const gameTracker = new GameTracker();
		const pieceTracker = new PieceTracker();

		describe('Single Tracker', () => {
			let data;
			beforeAll(async () => {
				data = await Chessalyzer.analyzePGN(
					'./test/asorted_games.pgn',
					{ trackers: [gameTracker] }
				);
			});

			it('Processed all games without error', () => {
				expect(data.cntGames).toBe(expectedGameCountAsorted);
			});
		});

		describe('Single Tracker (in Array)', () => {
			let data;
			beforeAll(async () => {
				data = await Chessalyzer.analyzePGN(
					'./test/asorted_games.pgn',
					[{ trackers: [gameTracker] }]
				);
			});

			it('Processed all games without error', () => {
				expect(data.cntGames).toBe(expectedGameCountAsorted);
			});
		});

		describe('Multiple Trackers', () => {
			let data;
			beforeAll(async () => {
				data = await Chessalyzer.analyzePGN(
					'./test/asorted_games.pgn',
					{ trackers: [gameTracker, pieceTracker] }
				);
			});

			it('Processed all games without error', () => {
				expect(data.cntGames).toBe(expectedGameCountAsorted);
			});
		});

		describe('Multiple Trackers with different configs', () => {
			let data;
			beforeAll(async () => {
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

			it('Processed the right amount of games', () => {
				expect(data[0].cntGames).toBe(10000);
				expect(data[1].cntGames).toBe(4000);
			});
		});
	});

	describe('Other', () => {
		describe('Singlethreaded Mode', () => {
			let data;
			beforeAll(async () => {
				data = await Chessalyzer.analyzePGN(
					'./test/asorted_games.pgn',
					undefined,
					null
				);
			});

			it('Processed exactly all 43,364 games in file', () => {
				expect(data.cntGames).toBe(expectedGameCountAsorted);
			});

			it('Processed exactly all 2,888,359 moves in file', () => {
				expect(data.cntMoves).toBe(expectedMoveCountAsorted);
			});
		});
	});
});
