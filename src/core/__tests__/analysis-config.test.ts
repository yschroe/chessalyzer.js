import { describe, expect, it } from 'bun:test';

import { normalizeAnalysisConfigs, normalizeAnalyzeOptions } from '#core/analysis-config';
import { defineMoveTracker } from '#trackers/define-tracker';
import { GameTracker } from '#trackers/game-tracker';
import { TileTracker } from '#trackers/tile/tile-tracker';
import type { AnalyzeOptions, AnalyzeRun } from '#types/analysis';

/** Pass intentionally invalid options past the type checker for runtime-guard tests. */
function invalidAnalyzeOptions(value: object): AnalyzeOptions {
    return value;
}

describe('normalizeAnalyzeOptions', () => {
    it('rejects empty runs', () => {
        expect(() => normalizeAnalyzeOptions(invalidAnalyzeOptions({ runs: [] }))).toThrow(
            'runs must contain at least one entry',
        );
    });

    it('rejects runs combined with top-level trackers', () => {
        expect(() =>
            normalizeAnalyzeOptions(
                invalidAnalyzeOptions({
                    runs: [{ trackers: [new TileTracker()] }],
                    trackers: [new TileTracker()],
                }),
            ),
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
            normalizeAnalyzeOptions(invalidAnalyzeOptions({ validation: 'validate' })),
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

    it('does not require tracker metadata for single-threaded analysis', () => {
        const tracker = new TileTracker();
        const { configs } = normalizeAnalysisConfigs([{ trackers: [tracker] }], {
            multithreaded: false,
        });
        expect(configs[0]?.trackerData).toEqual([]);
    });

    it('requires id for multithreaded analysis', () => {
        const tracker = defineMoveTracker({
            id: '',
            init: () => ({}),
            track: () => {},
            merge: () => {},
        });
        expect(() =>
            normalizeAnalysisConfigs([{ trackers: [tracker] }], {
                multithreaded: true,
            }),
        ).toThrow('non-empty id');
    });

    it('requires merge for multithreaded analysis', () => {
        const bare = {
            id: 'BareTracker',
            kind: 'move' as const,
            workerModule: import.meta.url,
            init: () => ({}),
            track: () => {},
        };
        expect(() =>
            normalizeAnalysisConfigs(
                [{ trackers: [bare as import('#types/tracker').TrackerDef] }],
                {
                    multithreaded: true,
                },
            ),
        ).toThrow('must implement merge');
    });

    it('threads tracker options to worker metadata', () => {
        const tracker = defineMoveTracker({
            id: 'opts-tracker',
            workerModule: import.meta.url,
            options: { minElo: 2000 },
            init: () => ({}),
            track: () => {},
            merge: () => {},
        });
        const { configs } = normalizeAnalysisConfigs([{ trackers: [tracker] }], {
            multithreaded: true,
        });
        expect(configs[0]?.trackerData).toEqual([
            { id: 'opts-tracker', module: import.meta.url, options: { minElo: 2000 } },
        ]);
    });
});
