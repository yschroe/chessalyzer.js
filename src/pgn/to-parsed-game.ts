import type { AssembledGame, ParsedGame, ParsedMove } from '#types/parse-pgn';

/** Create a {@link ParsedMove} at the single monomorphic construction site. */
function createParsedMove(san: string): ParsedMove {
    return { san };
}

/** Materialize public {@link ParsedGame} from a hot-path {@link AssembledGame}. */
export function toParsedGame(game: AssembledGame): ParsedGame {
    const moves = new Array<ParsedMove>(game.moves.length);
    for (let i = 0; i < game.moves.length; i++) {
        moves[i] = createParsedMove(game.moves[i]!);
    }
    return {
        moves,
        result: game.result,
        headers: game.headers,
    };
}
