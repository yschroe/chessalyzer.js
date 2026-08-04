import { describe, expect, it } from 'bun:test';

import { isPromotedPieceName, type PieceName, type StartingPieceName } from '#board/piece-names';
import { isStartingPieceName } from '#trackers/piece-types';
import type { MoveAction } from '#types/actions';

describe('piece-names', () => {
    it('isPromotedPieceName accepts promoted pawn names', () => {
        expect(isPromotedPieceName('Q17')).toBe(true);
        expect(isPromotedPieceName('Nb')).toBe(false);
    });

    it('isStartingPieceName narrows starting piece names', () => {
        expect(isStartingPieceName('Nb')).toBe(true);
        expect(isStartingPieceName('Q17')).toBe(false);
    });

    it('PieceName includes promoted names', () => {
        const action: MoveAction = {
            type: 'move',
            san: 'e4',
            player: 'w',
            piece: 'Pe',
            from: 'e2',
            to: 'e4',
        };
        const name: PieceName = action.piece;
        if (isStartingPieceName(name)) {
            const starting: StartingPieceName = name;
            expect(starting).toBe('Pe');
        }
    });
});
