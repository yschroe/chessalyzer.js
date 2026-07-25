/**
 * Analyzes committed test/fixtures/*.pgn and writes test/fixtures/manifest.json.
 *
 * Run after adding or changing fixture PGNs: bun run test:build-fixtures
 *
 * Uses single-threaded mode (multithreadCfg: null) for deterministic, fast analysis.
 */
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

import { Chessalyzer } from '../lib/index.js';

const FIXTURES_DIR = new URL('../test/fixtures/', import.meta.url).pathname;

const descriptions: Record<string, string> = {
    basic_normal: 'Standard complete game, single-line movetext',
    en_passant: 'Game containing an en passant capture',
    promotion: 'Game with a pawn promotion',
    multiple_promotions: 'Game with multiple pawn promotions',
    corrupt: 'One complete game plus one truncated game at EOF',
    white_wins: 'Short game ending 1-0',
    black_wins: 'Short game ending 0-1',
    draw: 'Short game ending 1/2-1/2',
    lichess_headers: 'Lichess-style headers with a complete game',
    comments_singleline: 'One game with comments, single-line movetext',
    comments_multiline: 'One game with comments, multi-line movetext',
    results_mix: 'Multiple games with mixed results and Elo headers for filter tests',
};

const files = (await readdir(FIXTURES_DIR)).filter((f) => f.endsWith('.pgn')).sort();
const fixtures: Record<string, object> = {};

for (const file of files) {
    const id = file.replace(/\.pgn$/, '');
    const path = join(FIXTURES_DIR, file);
    const result = await Chessalyzer.analyzePGN(path, { trackers: [] }, null);
    fixtures[id] = {
        file,
        description: descriptions[id] ?? id,
        expected: { cntGames: result.cntGames, cntMoves: result.cntMoves },
    };
    console.log(`${id}: ${result.cntGames} games, ${result.cntMoves} moves`);
}

const manifest = { dir: 'test/fixtures', fixtures };
await Bun.write(join(FIXTURES_DIR, 'manifest.json'), JSON.stringify(manifest, null, 4) + '\n');
console.log('\nWrote test/fixtures/manifest.json');
