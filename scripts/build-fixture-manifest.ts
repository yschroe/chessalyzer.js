/**
 * Analyzes committed test/fixtures/*.pgn and merges results into test/fixtures/manifest.json.
 * Preserves golden values and manual entries; per-fixture analyze overrides handle error fixtures.
 *
 * Run after adding or changing fixture PGNs: bun run test:build-fixtures
 *
 * Uses single-threaded mode for deterministic analysis.
 */
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { analyzePGN } from '../src/index';
import type { AnalyzeOptions } from '../src/types/analysis';

const FIXTURES_DIR = new URL('../test/fixtures/', import.meta.url).pathname;
const MANIFEST_PATH = join(FIXTURES_DIR, 'manifest.json');

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
    'bad-san-mid-file': 'Three games; middle game has illegal SAN (error-policy tests)',
    'crlf-endings': 'Two complete games with CRLF line endings',
};

/** Per-fixture analyze options, or `manual` to keep the existing manifest entry unchanged. */
const FIXTURE_ANALYZE: Record<string, AnalyzeOptions | 'manual'> = {
    'bad-san-mid-file': { onError: 'skip-game', workers: false },
};

interface ManifestExpected {
    cntGames: number;
    cntMoves: number;
    skippedGames?: number;
}

interface ManifestFixture {
    file: string;
    description: string;
    expected: ManifestExpected;
    analyzeOptions?: AnalyzeOptions;
    golden?: Record<string, unknown>;
}

interface Manifest {
    dir: string;
    fixtures: Record<string, ManifestFixture>;
}

async function loadExistingManifest(): Promise<Manifest> {
    try {
        const text = await readFile(MANIFEST_PATH, 'utf8');
        return JSON.parse(text) as Manifest;
    } catch {
        return { dir: 'test/fixtures', fixtures: {} };
    }
}

/** Options stored in manifest (workers are always false in the build script). */
function manifestAnalyzeOptions(
    policy: AnalyzeOptions | 'manual' | undefined,
): AnalyzeOptions | undefined {
    if (!policy || policy === 'manual') return undefined;
    const { workers: _workers, ...rest } = policy;
    return Object.keys(rest).length > 0 ? rest : undefined;
}

const existing = await loadExistingManifest();
const fixtures: Record<string, ManifestFixture> = {};
let hadError = false;

const files = (await readdir(FIXTURES_DIR)).filter((f) => f.endsWith('.pgn')).toSorted();

for (const file of files) {
    const id = file.replace(/\.pgn$/, '');
    const path = join(FIXTURES_DIR, file);
    const prior = existing.fixtures[id];
    const policy = FIXTURE_ANALYZE[id];

    if (policy === 'manual') {
        if (!prior) {
            console.error(`${id}: marked manual but missing from manifest.json`);
            hadError = true;
            continue;
        }
        fixtures[id] = { ...prior, file };
        console.log(`${id}: kept manual entry (${prior.expected.cntGames} games)`);
        continue;
    }

    const analyzeOpts: AnalyzeOptions = { workers: false, ...policy };

    try {
        const result = await analyzePGN(path, analyzeOpts);
        const expected: ManifestExpected = {
            cntGames: result.games,
            cntMoves: result.moves,
        };
        if ((result.skippedGames ?? 0) > 0) {
            expected.skippedGames = result.skippedGames;
        }

        fixtures[id] = {
            file,
            description: descriptions[id] ?? prior?.description ?? id,
            expected,
            ...(manifestAnalyzeOptions(policy)
                ? { analyzeOptions: manifestAnalyzeOptions(policy) }
                : {}),
            ...(prior?.golden ? { golden: prior.golden } : {}),
        };

        const skipped = expected.skippedGames ? `, ${expected.skippedGames} skipped` : '';
        console.log(`${id}: ${result.games} games, ${result.moves} moves${skipped}`);
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
