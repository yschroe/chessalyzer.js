import { Chessalyzer, GameTracker } from '../lib/chessalyzer.js';
import { describe, it, beforeAll, expect } from 'bun:test';

describe('GameTrackerBase', () => {
	describe('Basic Tests: Multithreaded', () => {
		let data;
		const gameTracker = new GameTracker();
		beforeAll(async () => {
			data = await Chessalyzer.analyzePGN('./test/asorted_games.pgn', {
				trackers: [gameTracker]
			});
		});

		it('Game count inside Game Tracker matches game count of Parser', () => {
			expect(data.cntGames).toBe(gameTracker.cntGames);
		});

		it('Sum of result object matches count of games', () => {
			const resultsSum = Object.values(gameTracker.results).reduce(
				(a, c) => a + c
			);
			expect(resultsSum).toBe(data.cntGames);
		});
	});

	describe('Basic Tests: Singlethreaded', () => {
		let data;
		const gameTracker = new GameTracker();
		beforeAll(async () => {
			data = await Chessalyzer.analyzePGN(
				'./test/asorted_games.pgn',
				{ trackers: [gameTracker] },
				null
			);
		});

		it('Game count inside Game Tracker matches game count of Parser', () => {
			expect(data.cntGames).toBe(gameTracker.cntGames);
		});

		it('Sum of result object matches count of games', () => {
			const resultsSum = Object.values(gameTracker.results).reduce(
				(a, c) => a + c
			);
			expect(resultsSum).toBe(data.cntGames);
		});
	});

	describe('Filtered Games: Result 1-0', () => {
		const gameTracker = new GameTracker();
		beforeAll(async () => {
			await Chessalyzer.analyzePGN('./test/asorted_games.pgn', {
				trackers: [gameTracker],
				config: {
					cntGames: 500,
					filter: (game) => game.Result === '1-0'
				}
			});
		});

		it('Win array shows only white wins', () => {
			expect(gameTracker.results.white).toBe(500);
			expect(gameTracker.results.black).toBe(0);
			expect(gameTracker.results.draw).toBe(0);
		});
	});

	describe('ECO Counts', () => {
		const gameTracker = new GameTracker();
		beforeAll(async () => {
			await Chessalyzer.analyzePGN('./test/asorted_games.pgn', {
				trackers: [gameTracker]
			});
		});

		it('Counted the ECOs correctly', () => {
			expect(gameTracker.ECO['A00']).toBe(1177);
			expect(gameTracker.ECO['B00']).toBe(632);
			expect(gameTracker.ECO['C00']).toBe(805);
		});
	});
});
