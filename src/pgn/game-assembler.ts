import type { Game } from '../types';
import { extractMoves, isGameResultLine, parseHeaderTag, stripComments } from './pgn-line-parser';

export interface ParseGamesOptions {
    readInHeader: boolean;
    maxGames?: number;
}

/**
 * Incremental PGN line parser that assembles complete {@link Game} objects.
 * Filtering is applied by the caller after {@link processLine} returns a game.
 */
export class GameLineParser {
    private game: Game = { moves: [] };

    constructor(private readonly options: ParseGamesOptions) {}

    /** Process one physical line; returns a completed game at game boundaries, else null. */
    processLine(line: string): Game | null {
        if (line === '') return null;

        if (line.startsWith('[')) {
            if (!this.options.readInHeader) return null;
            const header = parseHeaderTag(line);
            if (header) {
                const [key, value] = header;
                Object.assign(this.game, { [key]: value });
            }
            return null;
        }

        const cleanedLine = stripComments(line);

        const matchedMoves = extractMoves(cleanedLine);
        if (matchedMoves) {
            const moves = this.game.moves;
            for (let i = 0; i < matchedMoves.length; i += 1) {
                moves.push(matchedMoves[i]);
            }
        }

        if (isGameResultLine(cleanedLine)) {
            const completed = this.game;
            const resultMatch = cleanedLine.match(/(1-0|0-1|1\/2-1\/2)\s*$/);
            if (resultMatch) completed.Result = resultMatch[1];
            this.game = { moves: [] };
            return completed;
        }

        return null;
    }
}

/** Parse a sequence of PGN lines into complete games (for worker-side batch parsing). */
export function parseGamesFromLines(lines: Iterable<string>, options: ParseGamesOptions): Game[] {
    const parser = new GameLineParser(options);
    const games: Game[] = [];
    const maxGames = options.maxGames ?? Infinity;

    for (const line of lines) {
        const game = parser.processLine(line);
        if (!game) continue;
        games.push(game);
        if (games.length >= maxGames) break;
    }

    return games;
}
