import { extractMoves, isGameResultLine, parseHeaderTag, stripComments } from '#pgn/movetext';
import type { ParsedGame } from '#types/parse-pgn';

export interface ParseGamesOptions {
    parseHeaders: boolean;
    maxGames?: number;
}

/**
 * Incremental assembler that turns PGN lines into complete {@link ParsedGame} objects.
 * Filtering is applied by the caller after {@link processLine} returns a game.
 */
export class GameAssembler {
    private game: ParsedGame = { moves: [] };
    private headers: Record<string, string> | undefined;

    constructor(private readonly options: ParseGamesOptions) {}

    /** Process one physical line; returns a completed game at game boundaries, else null. */
    processLine(line: string): ParsedGame | null {
        if (line === '') return null;

        if (line.startsWith('[')) {
            if (!this.options.parseHeaders) return null;
            const header = parseHeaderTag(line);
            if (header) {
                const [key, value] = header;
                if (!this.headers) this.headers = {};
                this.headers[key] = value;
            }
            return null;
        }

        const cleanedLine = stripComments(line);

        const matchedMoves = extractMoves(cleanedLine);
        if (matchedMoves) {
            this.game.moves = this.game.moves.concat(matchedMoves);
        }

        if (isGameResultLine(cleanedLine)) {
            const completed: ParsedGame = { moves: this.game.moves };
            const resultMatch = cleanedLine.match(/(1-0|0-1|1\/2-1\/2)\s*$/);
            if (resultMatch) {
                completed.result = resultMatch[1];
            } else if (this.headers?.Result !== undefined) {
                completed.result = this.headers.Result;
            }
            if (this.headers) {
                completed.headers = { ...this.headers };
            }
            this.game = { moves: [] };
            this.headers = undefined;
            return completed;
        }

        return null;
    }
}

/** Assemble a sequence of PGN lines into complete games (for worker-side batch parsing). */
export function parseGamesFromLines(
    lines: Iterable<string>,
    options: ParseGamesOptions,
): ParsedGame[] {
    const assembler = new GameAssembler(options);
    const games: ParsedGame[] = [];
    const maxGames = options.maxGames ?? Infinity;

    for (const line of lines) {
        const game = assembler.processLine(line);
        if (!game) continue;
        games.push(game);
        if (games.length >= maxGames) break;
    }

    return games;
}
