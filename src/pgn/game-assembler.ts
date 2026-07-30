import { extractMoves, isGameResultLine, parseHeaderTag, stripComments } from '#pgn/movetext';
import type { AssembledGame } from '#types/parse-pgn';
import { isGameResult } from '#types/parse-pgn';

export interface ParseGamesOptions {
    parseHeaders: boolean;
    maxGames?: number;
}

function toGameResult(value: string) {
    return isGameResult(value) ? value : undefined;
}

/**
 * Incremental assembler that turns PGN lines into complete {@link AssembledGame} objects.
 * Filtering is applied by the caller after {@link processLine} returns a game.
 */
export class GameAssembler {
    private game: AssembledGame = { moves: [] };
    private headers: Record<string, string> | undefined;

    constructor(private readonly options: ParseGamesOptions) {}

    /** Process one physical line; returns a completed game at game boundaries, else null. */
    processLine(line: string): AssembledGame | null {
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
            const completed: AssembledGame = { moves: this.game.moves };
            const resultMatch = cleanedLine.match(/(1-0|0-1|1\/2-1\/2)\s*$/);
            if (resultMatch?.[1] !== undefined) {
                completed.result = toGameResult(resultMatch[1]);
            } else if (this.headers?.Result !== undefined) {
                completed.result = toGameResult(this.headers.Result);
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
): AssembledGame[] {
    const assembler = new GameAssembler(options);
    const games: AssembledGame[] = [];
    const maxGames = options.maxGames ?? Infinity;

    for (const line of lines) {
        const game = assembler.processLine(line);
        if (!game) continue;
        games.push(game);
        if (games.length >= maxGames) break;
    }

    return games;
}
