/* eslint-disable no-undef */
import assert from 'assert';
import { Chessalyzer } from '../lib/chessalyzer.js';

context('Core Features', function () {
	context('Basic Parsing', function () {
		describe('PGN File: Multiple Games, No Comments, Single Line for Moves', function () {
			this.timeout(20000);

			let data;
			before(async function () {
				data = await Chessalyzer.startBatch(
					'./test/lichess_db_standard_rated_2013-01_min.pgn',
					[]
				);
			});

			it('Processed exactly all 43,364 games in file', function () {
				assert.strictEqual(data.cntGames, 43364);
			});

			it('Processed exactly all 2,888,359 moves in file', function () {
				assert.strictEqual(data.cntMoves, 2888359);
			});
		});

		describe('PGN File: One Game, With Comments, Multiple Lines for Moves', function () {
			this.timeout(20000);

			let data;
			before(async function () {
				data = await Chessalyzer.startBatch(
					'./test/PGN_with_comments_multiline.pgn',
					[]
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
			this.timeout(20000);

			let data;
			before(async function () {
				data = await Chessalyzer.startBatch(
					'./test/PGN_with_comments_singleline.pgn',
					[]
				);
			});

			it('Processed the 1 game in file', function () {
				assert.strictEqual(data.cntGames, 1);
			});

			it('Processed all 26 moves in file', function () {
				assert.strictEqual(data.cntMoves, 26);
			});
		});
	});
	context('Filtering', function () {
		describe('Count', function () {
			this.timeout(20000);

			let data;
			before(async function () {
				data = await Chessalyzer.startBatch(
					'./test/lichess_db_standard_rated_2013-01_min.pgn',
					[],
					{ cntGames: 100 }
				);
			});

			it('Processed exactly 100 games of file', function () {
				assert.strictEqual(data.cntGames, 100);
			});
		});

		describe('Function', function () {
			this.timeout(20000);

			let data;
			before(async function () {
				data = await Chessalyzer.startBatch(
					'./test/lichess_db_standard_rated_2013-01_min.pgn',
					[],
					{ filter: (game) => game.Result === '1-0' }
				);
			});

			it('Processed all 22,203 games where white wins in file', function () {
				assert.strictEqual(data.cntGames, 22203);
			});
		});

		describe('Count + Function', function () {
			this.timeout(20000);

			let data;
			before(async function () {
				data = await Chessalyzer.startBatch(
					'./test/lichess_db_standard_rated_2013-01_min.pgn',
					[],
					{ cntGames: 500, filter: (game) => game.Result === '0-1' }
				);
			});

			it('Processed 500 games', function () {
				assert.strictEqual(data.cntGames, 500);
			});
		});
	});

	context('Other', function () {
		describe('Singlethreaded Mode', function () {
			this.timeout(20000);

			let data;
			before(async function () {
				data = await Chessalyzer.startBatch(
					'./test/lichess_db_standard_rated_2013-01_min.pgn',
					[],
					undefined,
					null
				);
			});

			it('Processed exactly all 43,364 games in file', function () {
				assert.strictEqual(data.cntGames, 43364);
			});

			it('Processed exactly all 2,888,359 moves in file', function () {
				assert.strictEqual(data.cntMoves, 2888359);
			});
		});
	});
});