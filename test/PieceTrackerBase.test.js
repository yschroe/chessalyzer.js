import { Chessalyzer, PieceTracker } from '../lib/chessalyzer.js';
import { describe, it, beforeAll, expect } from 'bun:test';

describe('PieceTrackerBase', () => {
	describe('Basic Tests: Multithreaded', () => {
		let pieceTracker = new PieceTracker();
		beforeAll(async () => {
			await Chessalyzer.analyzePGN('./test/asorted_games.pgn', {
				trackers: [pieceTracker]
			});
		});

		it('Tracked the correct values', () => {
			expect(pieceTracker.b.Ra.Qd).toBe(631);
		});
	});

	describe('Basic Tests: Singlethreaded', () => {
		let pieceTracker = new PieceTracker();
		beforeAll(async () => {
			await Chessalyzer.analyzePGN(
				'./test/asorted_games.pgn',
				{ trackers: [pieceTracker] },
				null
			);
		});

		it('Tracked the correct values', () => {
			expect(pieceTracker.b.Ra.Qd).toBe(631);
		});
	});

	describe('Heatmaps', () => {
		let pieceTracker = new PieceTracker();
		beforeAll(async () => {
			await Chessalyzer.analyzePGN('./test/asorted_games.pgn', {
				trackers: [pieceTracker]
			});
		});

		it('Worked with PIECE_CAPTURED preset', () => {
			const data = pieceTracker.generateHeatmap('PIECE_CAPTURED', 'a8');
			// didn't take itself
			expect(data.map[0][0]).toBe(0);

			// didn't take anything of same team
			expect(data.map[1][0]).toBe(0);

			expect(data.map[7][0]).toBe(1514);
		});

		it('Worked with PIECE_CAPTURED_BY preset', () => {
			const data = pieceTracker.generateHeatmap(
				'PIECE_CAPTURED_BY',
				'a8'
			);
			// wasn't taken by itself
			expect(data.map[0][0]).toBe(0);

			// wasn't taken by own team
			expect(data.map[1][0]).toBe(0);

			expect(data.map[7][0]).toBe(1487);
		});

		it('Works with Custom Function', () => {
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
			expect(data.map[0][0]).toBe(0);

			// wasn't taken by own team
			expect(data.map[1][0]).toBe(0);

			expect(data.map[7][0]).toBe(1487);
		});

		it('Throws an error if preset is not found', () => {
			expect(() =>
				pieceTracker.generateHeatmap('I_DO_NOT_EXIST', 'a8')
			).toThrow("Heatmap preset 'I_DO_NOT_EXIST' not found!");
		});
	});
});
