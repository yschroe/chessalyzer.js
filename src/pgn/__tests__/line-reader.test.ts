import { describe, it, expect } from 'bun:test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { readLinesFast } from '#pgn/line-reader';

const FIXTURES_DIR = join(new URL('../../../test/fixtures', import.meta.url).pathname);
const CRLF_FIXTURE = join(FIXTURES_DIR, 'crlf-endings.pgn');
const TMP_DIR = join(new URL('../../../test/.tmp', import.meta.url).pathname);

async function writeTmpPgn(name: string, content: string): Promise<string> {
    await mkdir(TMP_DIR, { recursive: true });
    const path = join(TMP_DIR, name);
    await writeFile(path, content);
    return path;
}

async function collectLines(path: string): Promise<string[]> {
    const lines: string[] = [];
    for await (const line of readLinesFast(path)) {
        lines.push(line);
    }
    return lines;
}

describe('readLinesFast', () => {
    it('reassembles a line split across read chunks', async () => {
        const longLine = 'x'.repeat(70 * 1024);
        const path = await writeTmpPgn('long-line.pgn', longLine);

        const lines = await collectLines(path);

        expect(lines).toEqual([longLine]);
    });

    it('preserves empty lines and trailing newline', async () => {
        const path = await writeTmpPgn('empty-lines.pgn', 'a\n\nb\n');

        const lines = await collectLines(path);

        expect(lines).toEqual(['a', '', 'b', '']);
    });

    it('strips CRLF line endings', async () => {
        const raw = await readFile(CRLF_FIXTURE);
        expect(raw.includes('\r\n')).toBe(true);

        const lines = await collectLines(CRLF_FIXTURE);

        expect(lines.every((line) => !line.includes('\r'))).toBe(true);
        expect(lines).toEqual([
            '[Event "CRLF test"]',
            '[Result "1-0"]',
            '',
            '1. e4 e5 2. Nf3 1-0',
            '',
            '',
            '[Event "CRLF test multiline"]',
            '[Result "1-0"]',
            '',
            '1. e4 1... e5 ',
            '2. Nf3 1-0',
            '',
        ]);
    });
});
