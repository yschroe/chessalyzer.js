import { describe, expect, it } from 'bun:test';

import { extractGameResult, stripComments } from '#pgn/movetext';

describe('extractGameResult', () => {
    it('recognizes all results, including suffixes without a token boundary', () => {
        for (const result of ['1-0', '0-1', '1/2-1/2', '*']) {
            for (const prefix of ['', '1. e4 e5 ', 'prefix', '1-0 * ']) {
                expect(extractGameResult(prefix + result)).toBe(result);
            }
        }
    });

    it('rejects empty lines, incomplete results, and non-result endings', () => {
        for (const line of ['', ' \t\n', '1. e4 e5', '1-', '1/2', '1-0!', '*x', '0-1 2.']) {
            expect(extractGameResult(line)).toBeNull();
        }
    });

    it('preserves regex whitespace semantics for every UTF-16 code unit', () => {
        const reference = /(1-0|0-1|1\/2-1\/2|\*)\s*$/;
        // Includes Unicode whitespace, line terminators, non-whitespace, and surrogates.
        for (let code = 0; code <= 0xffff; code += 1) {
            const suffix = String.fromCharCode(code);
            for (const result of ['1-0', '0-1', '1/2-1/2', '*']) {
                const line = `1. e4 e5 ${result}${suffix} \t\r\n`;
                const expected = reference.exec(line)?.[1] ?? null;
                const actual = extractGameResult(line);
                if (actual !== expected) {
                    throw new Error(`Result mismatch for ${JSON.stringify(line)}: ${actual}`);
                }
            }
        }
    });

    it('detects results after comment removal without treating comment contents as results', () => {
        expect(extractGameResult(stripComments('1. e4 {1-0} e5 (0-1)'))).toBeNull();
        expect(extractGameResult(stripComments('1. e4 e5 1/2-1/2 {done} (done)'))).toBe('1/2-1/2');
        expect(extractGameResult(stripComments('1. e4 e5 * {done}'))).toBe('*');
    });
});
