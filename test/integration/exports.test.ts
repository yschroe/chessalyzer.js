import { describe, expect, it } from 'bun:test';

import { analyzePGN } from 'chessalyzer';
import { isPromotedPieceName, squareToCoords } from 'chessalyzer/board';
import { gameTracker } from 'chessalyzer/trackers';

import { fixturePath } from '~/test/helpers/fixtures';

describe('package exports', () => {
    it('chessalyzer/board exposes coord helpers and piece-name guard', () => {
        expect(squareToCoords('e4')).toEqual([4, 4]);
        expect(isPromotedPieceName('Q17')).toBe(true);
        expect(isPromotedPieceName('Qd')).toBe(false);
    });

    it('analyzePGN accepts replay: board without importing ReplayMode', async () => {
        const games = gameTracker();
        await analyzePGN(fixturePath('basic-normal'), {
            trackers: [games],
            workers: false,
            replay: 'board',
            maxGames: 1,
        });
        expect(games.state.gameCount).toBe(1);
    });
});
