import type { Game } from '#types/game';

export interface GamesToPgnOptions {
    /** Emit `[Key "Value"]` tags for every Game field except `moves`. */
    includeHeaders: boolean;
}

/**
 * Re-encode assembled {@link Game} objects as PGN text for legacy multithreaded
 * dispatch (main thread filters/limits, then workers re-assemble and replay).
 */
export function gamesToPgnChunk(games: Game[], options: GamesToPgnOptions): string {
    const lines: string[] = [];
    for (const game of games) {
        if (options.includeHeaders) {
            for (const [key, value] of Object.entries(game)) {
                if (key === 'moves') continue;
                lines.push(`[${key} "${value}"]`);
            }
            lines.push('');
        }
        const result = game.Result ?? '1-0';
        lines.push(`${game.moves.join(' ')} ${result}`);
    }
    return lines.join('\n');
}
