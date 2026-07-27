import {
    extractMoves,
    isGameResultLine,
    parseHeaderTag,
    stripComments,
} from '#pgn/movetext-tokenizer';
import type { Game } from '#types/game';

export interface ParseGamesOptions {
    readInHeader: boolean;
    maxGames?: number;
}

/**
 * Incremental assembler that turns PGN lines into complete {@link Game} objects.
 * Filtering is applied by the caller after {@link processLine} returns a game.
 */
export class GameAssembler {
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
            this.game.moves = this.game.moves.concat(matchedMoves);
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

/** Assemble a sequence of PGN lines into complete games (for worker-side batch parsing). */
export function parseGamesFromLines(lines: Iterable<string>, options: ParseGamesOptions): Game[] {
    const assembler = new GameAssembler(options);
    const games: Game[] = [];
    const maxGames = options.maxGames ?? Infinity;

    for (const line of lines) {
        const game = assembler.processLine(line);
        if (!game) continue;
        games.push(game);
        if (games.length >= maxGames) break;
    }

    return games;
}
