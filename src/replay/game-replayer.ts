import SanApplier from '#replay/san-applier';
import SanContext from '#replay/san-context';
import SanToActions from '#replay/san-to-actions';
import type { ReplayPolicy } from '#replay/replay-policy';
import type { GameProcessorAnalysisConfig } from '#types/analysis-runtime';
import type { Game } from '#types/game';
import type { PlayerColor } from '#types/tokens';

/**
 * Orchestrates per-game analysis stages: game trackers → optional SAN replay → counters.
 *
 * Replay mode is chosen by the caller via {@link ReplayPolicy} (see {@link resolveReplayPolicy}),
 * not inferred inside this class.
 */
class GameReplayer {
    private readonly ctx: SanContext;
    private readonly applier: SanApplier;
    private readonly sanToActions: SanToActions;

    constructor() {
        this.ctx = new SanContext();
        this.applier = new SanApplier(this.ctx);
        this.sanToActions = new SanToActions(this.ctx);
    }

    /** Exposed for tests/debugging; same instance as `ctx.board`. */
    get board() {
        return this.ctx.board;
    }

    get activePlayer(): PlayerColor {
        return this.ctx.activePlayer;
    }

    /**
     * Run game trackers, optionally replay SAN / feed move trackers, then bump counters.
     * @param game Game with `moves[]` already extracted by the PGN assembler.
     * @param analysisCfg Trackers and running processed-game/move counts.
     * @param replay `'skip'` | `'none'` | `'actions'` — see {@link ReplayPolicy}.
     */
    processGame(
        game: Game,
        analysisCfg: GameProcessorAnalysisConfig,
        replay: ReplayPolicy,
    ): void {
        for (const tracker of analysisCfg.trackers.game) {
            tracker.analyze(game);
        }

        const { moves } = game;
        const moveTrackers = analysisCfg.trackers.move;
        const board = this.ctx.board;

        if (replay !== 'skip') {
            this.ctx.activePlayer = 'w';
            try {
                if (replay === 'actions') {
                    for (const san of moves) {
                        const currentMoveActions = this.sanToActions.parse(san);
                        for (const tracker of moveTrackers) {
                            tracker.analyze(currentMoveActions);
                        }
                        board.applyActions(currentMoveActions);
                        this.ctx.activePlayer = this.ctx.activePlayer === 'w' ? 'b' : 'w';
                    }
                } else {
                    for (const san of moves) {
                        this.applier.apply(san);
                        this.ctx.activePlayer = this.ctx.activePlayer === 'w' ? 'b' : 'w';
                    }
                }
            } catch (err) {
                console.log(game);
                board.printPosition();
                throw err;
            }
        }

        for (const tracker of moveTrackers) {
            tracker.nextGame?.();
        }

        analysisCfg.processedMoves += moves.length;
        analysisCfg.processedGames += 1;
        this.ctx.reset();
    }

    reset(): void {
        this.ctx.reset();
    }
}

export default GameReplayer;
