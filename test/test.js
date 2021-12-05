/* eslint-disable no-undef */
import assert from 'assert';
import { Chessalyzer } from '../lib/chessalyzer.js';

describe('Basic Parsing', function () {
	this.timeout(20000);

	let data;
	before(async function () {
		data = await Chessalyzer.startBatch(
			'./test/lichess_db_standard_rated_2013-01_min.pgn',
			[]
		);
	});

	it('Processed all 43,364 games in file', function () {
		assert.strictEqual(data.cntGames, 43364);
	});

	it('Processed all 2,888,359 moves in file', function () {
		assert.strictEqual(data.cntMoves, 2888359);
	});
});

describe('Basic Parsing: PGN with comments (moves: multiple lines)', function () {
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

describe('Basic Parsing: PGN with comments (moves: single line)', function () {
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

describe('Game Filter: Count', function () {
	this.timeout(20000);

	let data;
	before(async function () {
		data = await Chessalyzer.startBatch(
			'./test/lichess_db_standard_rated_2013-01_min.pgn',
			[],
			{ cntGames: 100 }
		);
	});

	it('Processed exactly 100 games in file', function () {
		assert.strictEqual(data.cntGames, 100);
	});
});

describe('Game Filter: Function', function () {
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

describe('Game Filter: Count + Function', function () {
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
