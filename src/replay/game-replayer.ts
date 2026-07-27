import { collectError, createReplayError, toAbortError } from '#core/analyze-errors';
import { isReplayFailure } from '#replay/replay-failure';
import type { ReplayPolicy } from '#replay/replay-policy';
import SanApplier from '#replay/san-applier';
import SanContext from '#replay/san-context';
import SanToActions from '#replay/san-to-actions';
import type { GameProcessorAnalysisConfig } from '#types/analysis-runtime';
import type { Game } from '#types/game';
import type { PlayerColor } from '#types/tokens';
import type { Tracker } from '#types/tracker';

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
     * @param replayPolicy `'skip'` | `'none'` | `'actions'` — see {@link ReplayPolicy}.
     * @param gameIndex Zero-based index of this game in the processing stream.
     * @param onError `'abort'` throws on replay failure; `'skip-game'` records and continues.
     */
    processGame(
        game: Game,
        analysisCfg: GameProcessorAnalysisConfig,
        replayPolicy: ReplayPolicy,
        gameIndex: number,
        onError: 'abort' | 'skip-game',
    ): void {
        for (const tracker of analysisCfg.trackers.game) {
            tracker.analyze(game);
        }

        const { moves } = game;
        const moveTrackers = analysisCfg.trackers.move;

        let replayOk = true;
        if (replayPolicy !== 'skip') {
            replayOk = this.replayMoves(
                game,
                moveTrackers,
                replayPolicy,
                gameIndex,
                onError,
                analysisCfg,
            );
        }

        if (!replayOk) {
            for (const tracker of moveTrackers) {
                tracker.nextGame?.();
            }
            return;
        }

        for (const tracker of moveTrackers) {
            tracker.nextGame?.();
        }

        analysisCfg.processedMoves += moves.length;
        analysisCfg.processedGames += 1;
        this.ctx.reset();
    }

    /** Replay movetext onto the board; optionally emit actions for move trackers. Returns false when skipped. */
    private replayMoves(
        game: Game,
        moveTrackers: Tracker[],
        replayPolicy: ReplayPolicy,
        gameIndex: number,
        onError: 'abort' | 'skip-game',
        analysisCfg: GameProcessorAnalysisConfig,
    ): boolean {
        const { moves } = game;
        const board = this.ctx.board;
        this.ctx.activePlayer = 'w';
        let moveIndex = 0;

        try {
            if (replayPolicy === 'actions') {
                for (; moveIndex < moves.length; moveIndex += 1) {
                    const san = moves[moveIndex];
                    if (!san) continue;
                    const currentMoveActions = this.sanToActions.parse(san);
                    for (const tracker of moveTrackers) {
                        tracker.analyze(currentMoveActions);
                    }
                    board.applyActions(currentMoveActions);
                    this.ctx.activePlayer = this.ctx.activePlayer === 'w' ? 'b' : 'w';
                }
            } else {
                for (; moveIndex < moves.length; moveIndex += 1) {
                    const san = moves[moveIndex];
                    if (!san) continue;
                    this.applier.apply(san);
                    this.ctx.activePlayer = this.ctx.activePlayer === 'w' ? 'b' : 'w';
                }
            }
        } catch (err) {
            if (process.env.CHESSALYZER_DEBUG_REPLAY) {
                console.log(game);
                board.printPosition();
            }

            this.ctx.reset();

            const san = moves[moveIndex];
            const reason = isReplayFailure(err) ? err.reason : 'IllegalMove';
            const message = err instanceof Error ? err.message : String(err);
            const replayError = createReplayError(
                { gameIndex, moveIndex, san },
                reason,
                message,
                err,
            );

            if (onError === 'abort') {
                throw toAbortError(replayError);
            }

            collectError(analysisCfg.errors, replayError);
            analysisCfg.skippedGames += 1;
            return false;
        }

        return true;
    }

    reset(): void {
        this.ctx.reset();
    }
}

export default GameReplayer;
