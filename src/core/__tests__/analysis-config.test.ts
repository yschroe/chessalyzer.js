import { describe, expect, it } from 'bun:test';

import { normalizeAnalysisConfigs, normalizeAnalyzeOptions } from '#core/analysis-config';
import { GameTracker } from '#trackers/game-tracker';
import { TileTracker } from '#trackers/tile/tile-tracker';
import type { AnalyzeRun } from '#types/analysis';

describe('normalizeAnalyzeOptions', () => {
    it('rejects empty runs', () => {
        expect(() => normalizeAnalyzeOptions({ runs: [] })).toThrow(
            'runs must contain at least one entry',
        );
    });

    it('rejects runs combined with top-level trackers', () => {
        expect(() =>
            normalizeAnalyzeOptions({
                runs: [{ trackers: [new TileTracker()] }],
                trackers: [new TileTracker()],
            }),
        ).toThrow('Cannot set both runs and top-level trackers');
    });
});

describe('normalizeAnalysisConfigs', () => {
    const baseRun: AnalyzeRun = { trackers: [] };

    it('does not parse headers when only a filter is present', () => {
        const { parseHeaders } = normalizeAnalysisConfigs([{ ...baseRun, filter: () => true }]);
        expect(parseHeaders).toBe(false);
    });

    it('sets parseHeaders false when maxGames is finite without filter', () => {
        const { parseHeaders } = normalizeAnalysisConfigs([{ ...baseRun, maxGames: 10 }]);
        expect(parseHeaders).toBe(false);
    });

    it('honors explicit headers: true', () => {
        const { parseHeaders } = normalizeAnalysisConfigs([baseRun], { headers: true });
        expect(parseHeaders).toBe(true);
    });

    it('throws when headers: false with a game tracker', () => {
        expect(() =>
            normalizeAnalysisConfigs([{ trackers: [new GameTracker()] }], { headers: false }),
        ).toThrow('headers: false cannot be used with game trackers');
    });

    it('honors explicit headers: false when no game tracker', () => {
        const { parseHeaders } = normalizeAnalysisConfigs([baseRun], { headers: false });
        expect(parseHeaders).toBe(false);
    });

    it('sets replayMode from trackers by default', () => {
        const { configs } = normalizeAnalysisConfigs([{ trackers: [new TileTracker()] }]);
        expect(configs[0]?.replayMode).toBe('actions');
    });

    it('applies explicit replay override', () => {
        const { configs } = normalizeAnalysisConfigs([baseRun], { replay: 'board' });
        expect(configs[0]?.replayMode).toBe('board');
    });

    it('throws when move trackers conflict with replay override', () => {
        expect(() =>
            normalizeAnalysisConfigs([{ trackers: [new TileTracker()] }], { replay: 'skip' }),
        ).toThrow('Move trackers require replay: "actions"');
    });

    it('sets parseHeaders when game tracker is present', () => {
        const { parseHeaders } = normalizeAnalysisConfigs([{ trackers: [new GameTracker()] }]);
        expect(parseHeaders).toBe(true);
    });

    it('normalizes maxGames on each config', () => {
        const { configs } = normalizeAnalysisConfigs([{ ...baseRun, maxGames: 100 }]);
        expect(configs[0]?.config.maxGames).toBe(100);
        expect(configs[0]?.config.hasFilter).toBe(false);
    });

    it('marks hasFilter when a user filter is provided', () => {
        const { configs } = normalizeAnalysisConfigs([
            { ...baseRun, filter: (g) => g.result === '1-0' },
        ]);
        expect(configs[0]?.config.hasFilter).toBe(true);
    });

    it('returns one normalized config per run', () => {
        const { configs } = normalizeAnalysisConfigs([baseRun]);
        expect(configs).toHaveLength(1);
    });
});
