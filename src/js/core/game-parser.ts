import type { Action, Game, GameProcessorAnalysisConfig } from '../interfaces';
import type { PlayerColor } from '../types';
import ChessBoard from './chess-board';

class GameParser {
    board: ChessBoard;

    constructor() {
        this.board = new ChessBoard();
    }

    /**
     * Main function for parsing a read-in PGN game. Moves are parsed and applied
     * in WASM via a single boundary crossing per game.
     */
    processGame(game: Game, analysisCfg: GameProcessorAnalysisConfig): void {
        for (const tracker of analysisCfg.trackers.game) {
            tracker.analyze(game);
        }

        const { moves } = game;

        try {
            if (analysisCfg.trackers.move.length === 0) {
                this.board.processGameQuiet(moves);
            } else {
                const moveActionGroups = this.board.processGame(moves);

                for (const currentMoveActions of moveActionGroups) {
                    for (const tracker of analysisCfg.trackers.move) {
                        tracker.analyze(currentMoveActions);
                    }
                }
            }
        } catch (err) {
            console.log(game);
            this.board.printPosition();
            throw err;
        }

        for (const tracker of analysisCfg.trackers.move) {
            tracker.nextGame?.();
        }

        analysisCfg.processedMoves += moves.length;
        analysisCfg.processedGames += 1;
        this.board.reset();
    }

    reset(): void {
        this.board.reset();
    }
}

export default GameParser;
