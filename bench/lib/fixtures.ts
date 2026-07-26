/** Typical move count per PGN movetext line. */
export const SINGLE = 40;

/** Typical leftover line count when splitting PGN chunks. */
export const BULK = 20;

const MOVE_SAMPLES = ['e4', 'Nf3', 'Bb5', 'O-O', 'Qxd5', 'exf6', 'Rh3', 'a6', 'c3', 'd4'] as const;

const LINE_PREFIXES = [
    '1. e4 e5 2. Nf3 Nc6 3. Bb5',
    '1. d4 Nf6 2. c4 e6 3. Nc3',
    '1. e4 c5 2. Nf3 d6 3. d4 cxd4',
    '1. e4 e6 2. d4 d5 3. Nc3 Bb4',
    '1. d4 d5 2. c4 c6 3. Nc3 Nf6',
] as const;

/** Short move-token strings (mirrors move-regex capture output). */
export function makeMoveTokens(count: number): string[] {
    const tokens: string[] = [];
    for (let i = 0; i < count; i += 1) {
        tokens.push(MOVE_SAMPLES[i % MOVE_SAMPLES.length]!);
    }
    return tokens;
}

/** Multi-character PGN line strings (mirrors line-reader chunk lines). */
export function makePgnLines(count: number): string[] {
    const lines: string[] = [];
    for (let i = 0; i < count; i += 1) {
        lines.push(`${LINE_PREFIXES[i % LINE_PREFIXES.length]!} move-${i}`);
    }
    return lines;
}
