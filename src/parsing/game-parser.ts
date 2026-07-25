import type { GameProcessorAnalysisConfig } from '#types/analysis';
import type { Game } from '#types/game';
import type { PlayerColor } from '#types/tokens';
import SanApplier from './san-applier';
import SanContext from './san-context';
import SanParser from './san-parser';

/**
 * Orchestrates SAN replay for one game at a time.
 *
 * Delegates move semantics to {@link SanApplier} (no trackers) or {@link SanParser}
 * (trackers attached). Owns a long-lived {@link SanContext} whose board persists
 * across games within a worker thread or single-threaded run.
 */
class GameParser {
    private readonly ctx: SanContext;
    private readonly applier: SanApplier;
    private readonly parser: SanParser;

    /** Exposed for tests/debugging; same instance as `ctx.board`. */
    get board() {
        return this.ctx.board;
    }

    get activePlayer(): PlayerColor {
        return this.ctx.activePlayer;
    }

    constructor() {
        this.ctx = new SanContext();
        this.applier = new SanApplier(this.ctx);
        this.parser = new SanParser(this.ctx);
    }

    /**
     * Replay all moves in `game`, feed trackers, and update processed counters.
     * @param game Game with `moves[]` already extracted by the PGN line parser.
     * @param analysisCfg Trackers and running processed-game/move counts.
     */
    processGame(game: Game, analysisCfg: GameProcessorAnalysisConfig): void {
        for (const tracker of analysisCfg.trackers.game) {
            tracker.analyze(game);
        }

        const { moves } = game;
        const moveTrackers = analysisCfg.trackers.move;
        const hasMoveTrackers = moveTrackers.length > 0;
        const board = this.ctx.board;

        this.ctx.activePlayer = 'w';
        try {
            if (hasMoveTrackers) {
                for (let mi = 0; mi < moves.length; mi += 1) {
                    const currentMoveActions = this.parser.parse(moves[mi]);
                    for (let ti = 0; ti < moveTrackers.length; ti += 1) {
                        moveTrackers[ti].analyze(currentMoveActions);
                    }
                    board.applyActions(currentMoveActions);
                    this.ctx.activePlayer = this.ctx.activePlayer === 'w' ? 'b' : 'w';
                }
            } else {
                for (let mi = 0; mi < moves.length; mi += 1) {
                    this.applier.apply(moves[mi]);
                    this.ctx.activePlayer = this.ctx.activePlayer === 'w' ? 'b' : 'w';
                }
            }
        } catch (err) {
            console.log(game);
            board.printPosition();
            throw err;
        }

        for (let ti = 0; ti < moveTrackers.length; ti += 1) {
            moveTrackers[ti].nextGame?.();
        }

        analysisCfg.processedMoves += moves.length;
        analysisCfg.processedGames += 1;
        this.ctx.reset();
    }

    reset(): void {
        this.ctx.reset();
    }
}

export default GameParser;
