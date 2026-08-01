import { describe, expect, it } from 'bun:test';

import { normalizeAnalyzeOptions } from '#core/analysis-config';
import { defineMoveTracker } from '#trackers/define-tracker';
import { GameTracker } from '#trackers/game-tracker';
import { TileTracker } from '#trackers/tile/tile-tracker';
import type { AnalyzeOptions } from '#types/analysis';

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
                    runs: [{ trackers: [TileTracker] }],
                    trackers: [TileTracker],
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
        const { configs, multithreadCfg } = normalizeAnalyzeOptions({
            workers: false,
            filter: () => true,
        });
        expect(multithreadCfg).toBeNull();
        expect(configs[0]?.config.filter).toBeDefined();
    });

    it('rejects filter in multi-run without workers: false', () => {
        expect(() =>
            normalizeAnalyzeOptions({
                runs: [{ filter: () => true }, { trackers: [TileTracker] }],
            }),
        ).toThrow('filter requires workers: false');
    });

    it('does not parse headers when only a filter is present', () => {
        const { parseHeaders } = normalizeAnalyzeOptions({ workers: false, filter: () => true });
        expect(parseHeaders).toBe(false);
    });

    it('sets parseHeaders false when maxGames is finite without filter', () => {
        const { parseHeaders } = normalizeAnalyzeOptions({ workers: false, maxGames: 10 });
        expect(parseHeaders).toBe(false);
    });

    it('honors explicit headers: true', () => {
        const { parseHeaders } = normalizeAnalyzeOptions({ workers: false, headers: true });
        expect(parseHeaders).toBe(true);
    });

    it('throws when headers: false with a game tracker', () => {
        expect(() =>
            normalizeAnalyzeOptions({
                workers: false,
                trackers: [GameTracker],
                headers: false,
            }),
        ).toThrow('headers: false cannot be used with game trackers');
    });

    it('honors explicit headers: false when no game tracker', () => {
        const { parseHeaders } = normalizeAnalyzeOptions({ workers: false, headers: false });
        expect(parseHeaders).toBe(false);
    });

    it('sets replayMode from trackers by default', () => {
        const { configs } = normalizeAnalyzeOptions({
            workers: false,
            trackers: [TileTracker],
        });
        expect(configs[0]?.replayMode).toBe('actions');
    });

    it('applies explicit replay override', () => {
        const { configs } = normalizeAnalyzeOptions({ workers: false, replay: 'board' });
        expect(configs[0]?.replayMode).toBe('board');
    });

    it('throws when move trackers conflict with replay override', () => {
        expect(() =>
            normalizeAnalyzeOptions({
                workers: false,
                trackers: [TileTracker],
                replay: 'skip',
            }),
        ).toThrow('Move trackers require replay: "actions"');
    });

    it('sets parseHeaders when game tracker is present', () => {
        const { parseHeaders } = normalizeAnalyzeOptions({
            workers: false,
            trackers: [GameTracker],
        });
        expect(parseHeaders).toBe(true);
    });

    it('normalizes maxGames on each config', () => {
        const { configs } = normalizeAnalyzeOptions({ workers: false, maxGames: 100 });
        expect(configs[0]?.config.maxGames).toBe(100);
        expect(configs[0]?.config.filter).toBeUndefined();
    });

    it('returns one normalized config per run', () => {
        const { configs } = normalizeAnalyzeOptions({ workers: false });
        expect(configs).toHaveLength(1);
    });

    it('does not require tracker metadata for single-threaded analysis', () => {
        const { configs } = normalizeAnalyzeOptions({
            workers: false,
            trackers: [TileTracker],
        });
        expect(configs[0]?.trackerData).toBeUndefined();
    });

    it('requires id for multithreaded analysis', () => {
        const tracker = defineMoveTracker({
            id: '',
            init: () => ({}),
            track: () => {},
            merge: () => {},
        });
        expect(() => normalizeAnalyzeOptions({ trackers: [tracker] })).toThrow('non-empty id');
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
            normalizeAnalyzeOptions({
                trackers: [bare as import('#types/tracker').TrackerDef],
            }),
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
        const { configs } = normalizeAnalyzeOptions({ trackers: [tracker] });
        expect(configs[0]?.trackerData).toEqual([
            { id: 'opts-tracker', module: import.meta.url, options: { minElo: 2000 } },
        ]);
    });
});
