/**
 * Analyzes committed test/fixtures/*.pgn and writes test/fixtures/manifest.json.
 * Use a tested version of chessalyzer for the generation of correct expected values.
 *
 * Run after adding or changing fixture PGNs: bun run test:build-fixtures
 *
 * Uses single-threaded mode for deterministic analysis.
 */
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

import { analyzePGN } from '../src/index';

const FIXTURES_DIR = new URL('../test/fixtures/', import.meta.url).pathname;

const descriptions: Record<string, string> = {
    'basic-normal': 'Standard complete game, single-line movetext',
    'en-passant': 'Game containing an en passant capture',
    promotion: 'Game with a pawn promotion',
    'multiple-promotions': 'Game with multiple pawn promotions',
    corrupt: 'One complete game plus one truncated game at EOF',
    'white-wins': 'Short game ending 1-0',
    'black-wins': 'Short game ending 0-1',
    draw: 'Short game ending 1/2-1/2',
    'lichess-headers': 'Lichess-style headers with a complete game',
    'comments-singleline': 'One game with comments, single-line movetext',
    'comments-multiline': 'One game with comments, multi-line movetext',
    'results-mix': 'Multiple games with mixed results and Elo headers for filter tests',
};

const files = (await readdir(FIXTURES_DIR)).filter((f) => f.endsWith('.pgn')).toSorted();

const fixtures: Record<string, object> = {};
for (const file of files) {
    const id = file.replace(/\.pgn$/, '');
    const path = join(FIXTURES_DIR, file);

    const result = await analyzePGN(path, { workers: false });

    fixtures[id] = {
        file,
        description: descriptions[id] ?? id,
        expected: { cntGames: result.games, cntMoves: result.moves },
    };
    console.log(`${id}: ${result.games} games, ${result.moves} moves`);
}

const manifest = { dir: 'test/fixtures', fixtures };
await Bun.write(join(FIXTURES_DIR, 'manifest.json'), JSON.stringify(manifest, null, 4) + '\n');
console.log('\nWrote test/fixtures/manifest.json');
