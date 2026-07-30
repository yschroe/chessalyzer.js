import { describe, expect, it } from 'bun:test';

import { normalizeAnalysisConfigs, normalizeAnalyzeOptions } from '#core/analysis-config';
import { MoveTracker } from '#trackers/base-tracker';
import { GameTracker } from '#trackers/game-tracker';
import { TileTracker } from '#trackers/tile/tile-tracker';
import type { AnalyzeOptions, AnalyzeRun } from '#types/analysis';

describe('normalizeAnalyzeOptions', () => {
    it('rejects empty runs', () => {
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- invalid input for runtime guard
        expect(() => normalizeAnalyzeOptions({ runs: [] } as unknown as AnalyzeOptions)).toThrow(
            'runs must contain at least one entry',
        );
    });

    it('rejects runs combined with top-level trackers', () => {
        expect(() =>
            normalizeAnalyzeOptions({
                runs: [{ trackers: [new TileTracker()] }],
                trackers: [new TileTracker()],
            } as unknown as AnalyzeOptions),
        ).toThrow('Cannot set both runs and top-level trackers');
    });

    it('rejects filter without workers: false', () => {
        expect(() =>
            normalizeAnalyzeOptions({
                filter: () => true,
            }),
        ).toThrow('filter requires workers: false');
    });

    it('allows filter with workers: false', () => {
        const { runs, multithreadCfg } = normalizeAnalyzeOptions({
            workers: false,
            filter: () => true,
        });
        expect(multithreadCfg).toBeNull();
        expect(runs[0]?.filter).toBeDefined();
    });

    it('rejects filter in multi-run without workers: false', () => {
        expect(() =>
            normalizeAnalyzeOptions({
                runs: [{ filter: () => true }, { trackers: [new TileTracker()] }],
            }),
        ).toThrow('filter requires workers: false');
    });

    it('rejects validation: validate until implemented', () => {
        expect(() =>
            normalizeAnalyzeOptions({ validation: 'validate' } as unknown as AnalyzeOptions),
        ).toThrow('validation: "validate" is not yet implemented');
    });

    it('allows validation: trust (default replay behavior)', () => {
        expect(() => normalizeAnalyzeOptions({ validation: 'trust' })).not.toThrow();
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

    it('does not require trackerId for single-threaded analysis', () => {
        const tracker = new TileTracker();
        const { configs } = normalizeAnalysisConfigs([{ trackers: [tracker] }], {
            multithreaded: false,
        });
        expect(configs[0]?.trackerData).toEqual([]);
    });

    it('requires trackerId for multithreaded analysis', () => {
        class LocalTracker extends MoveTracker {
            override trackMoves() {}
        }
        expect(() =>
            normalizeAnalysisConfigs([{ trackers: [new LocalTracker()] }], {
                multithreaded: true,
            }),
        ).toThrow('static trackerId');
    });

    it('requires merge for multithreaded analysis', () => {
        class BareTracker extends MoveTracker {
            static override trackerId = 'BareTracker';
            static override workerModule = import.meta.url;
            override trackMoves() {}
        }
        expect(() =>
            normalizeAnalysisConfigs([{ trackers: [new BareTracker()] }], {
                multithreaded: true,
            }),
        ).toThrow('must implement merge');
    });
});
