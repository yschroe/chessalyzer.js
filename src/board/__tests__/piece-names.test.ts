import { describe, expect, it } from 'bun:test';

import { isPromotedPieceName, type BoardPieceName, type Piece } from '#board/piece-names';
import { isTrackedPiece } from '#trackers/piece-types';
import type { MoveAction } from '#types/actions';

describe('board piece names', () => {
    it('recognizes promoted pawn names from board replay', () => {
        expect(isPromotedPieceName('Q17')).toBe(true);
        expect(isPromotedPieceName('Nb')).toBe(false);
        expect(isPromotedPieceName('Pa')).toBe(false);
    });

    it('narrows starting pieces for tracker indexing', () => {
        const action: MoveAction = {
            type: 'move',
            san: 'e4',
            player: 'w',
            piece: 'Pe',
            from: 'e2',
            to: 'e4',
        };

        const name: BoardPieceName | null = action.piece;
        if (name !== null && isTrackedPiece(name)) {
            const starting: Piece = name;
            expect(starting).toBe('Pe');
        } else {
            throw new Error('expected starting piece');
        }
    });
});
