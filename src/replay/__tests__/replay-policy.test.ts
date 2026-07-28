import { describe, expect, it } from 'bun:test';

import { resolveEffectiveReplayMode, resolveReplayMode } from '#replay/replay-policy';

describe('resolveReplayMode', () => {
    it('returns actions when move trackers are present', () => {
        expect(resolveReplayMode(true)).toBe('actions');
    });

    it('returns skip or board when no move trackers', () => {
        const mode = resolveReplayMode(false);
        expect(mode === 'skip' || mode === 'board').toBe(true);
    });
});

describe('resolveEffectiveReplayMode', () => {
    it('defers to resolveReplayMode when user replay is omitted', () => {
        expect(resolveEffectiveReplayMode(true)).toBe('actions');
        expect(resolveEffectiveReplayMode(false)).toBe(resolveReplayMode(false));
    });

    it('allows explicit actions without move trackers', () => {
        expect(resolveEffectiveReplayMode(false, 'actions')).toBe('actions');
    });

    it('allows explicit board or skip without move trackers', () => {
        expect(resolveEffectiveReplayMode(false, 'board')).toBe('board');
        expect(resolveEffectiveReplayMode(false, 'skip')).toBe('skip');
    });

    it('throws when move trackers are present and replay is not actions', () => {
        expect(() => resolveEffectiveReplayMode(true, 'skip')).toThrow(
            'Move trackers require replay: "actions"',
        );
        expect(() => resolveEffectiveReplayMode(true, 'board')).toThrow(
            'Move trackers require replay: "actions"',
        );
    });
});
