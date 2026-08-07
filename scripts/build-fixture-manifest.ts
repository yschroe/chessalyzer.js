/**
 * Analyzes committed test/fixtures/*.pgn and merges results into test/fixtures/manifest.json.
 * Preserves golden values and existing descriptions when regenerating expected counts.
 *
 * Run after adding or changing fixture PGNs: bun run test:build-fixtures
 *
 * Uses single-threaded mode for deterministic analysis (no trackers — parse/count smoke only).
 */
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzePGN } from '#core/analyze';

const FIXTURES_DIR = fileURLToPath(new URL('../test/fixtures/', import.meta.url));
const MANIFEST_PATH = join(FIXTURES_DIR, 'manifest.json');

const descriptions: Record<string, string> = {
    'basic-normal': 'Standard complete game, single-line movetext',
    'en-passant': 'Game containing an en passant capture',
    promotion: 'Game with a pawn promotion',
    'multiple-promotions': 'Game with multiple pawn promotions',
    corrupt:
        'One complete game plus one truncated game at EOF (incomplete trailing game dropped at parse)',
    'white-wins': 'Short game ending 1-0',
    'black-wins': 'Short game ending 0-1',
    draw: 'Short game ending 1/2-1/2',
    'lichess-headers': 'Lichess-style headers with a complete game',
    'comments-singleline': 'One game with comments, single-line movetext',
    'comments-multiline': 'One game with comments, multi-line movetext',
    'results-mix': 'Multiple games with mixed results and Elo headers for filter tests',
    'bad-san-mid-file': 'Three games; middle game has illegal SAN (error-policy tests)',
    'crlf-endings': 'Two complete games with CRLF line endings',
};

interface ManifestExpected {
    games: number;
    moves: number;
}

interface ManifestFixture {
    file: string;
    description: string;
    expected: ManifestExpected;
    golden?: Record<string, unknown>;
}

interface Manifest {
    dir: string;
    fixtures: Record<string, ManifestFixture>;
}

async function loadExistingManifest(): Promise<Manifest> {
    try {
        const text = await readFile(MANIFEST_PATH, 'utf8');
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- build script reads self-generated manifest.json
        return JSON.parse(text) as Manifest;
    } catch {
        return { dir: 'test/fixtures', fixtures: {} };
    }
}

const existing = await loadExistingManifest();
const fixtures: Record<string, ManifestFixture> = {};
let hadError = false;

const files = (await readdir(FIXTURES_DIR)).filter((f) => f.endsWith('.pgn')).toSorted();

for (const file of files) {
    const id = file.replace(/\.pgn$/, '');
    const path = join(FIXTURES_DIR, file);
    const prior = existing.fixtures[id];

    try {
        // oxlint-disable-next-line eslint/no-await-in-loop -- sequential fixture analysis for readable logs and lower memory use
        const result = await analyzePGN(path, { workers: false });
        fixtures[id] = {
            file,
            description: descriptions[id] ?? prior?.description ?? id,
            expected: {
                games: result.gameCount,
                moves: result.moveCount,
            },
            ...(prior?.golden ? { golden: prior.golden } : {}),
        };

        console.log(`${id}: ${result.gameCount} games, ${result.moveCount} moves`);
    } catch (err) {
        if (prior) {
            fixtures[id] = { ...prior, file };
            const message = err instanceof Error ? err.message : String(err);
            console.warn(`${id}: analyze failed, kept existing entry (${message})`);
            continue;
        }

        const message = err instanceof Error ? err.message : String(err);
        console.error(`${id}: analyze failed with no existing manifest entry (${message})`);
        hadError = true;
    }
}

if (hadError) process.exit(1);

const manifest: Manifest = { dir: 'test/fixtures', fixtures };
await Bun.write(MANIFEST_PATH, JSON.stringify(manifest, null, 4) + '\n');
console.log('\nWrote test/fixtures/manifest.json');
