import { describe, expect, it } from 'bun:test';

import { normalizeAnalyzeOptions } from '#core/analysis-config';
import { defineMoveTracker } from '#trackers/define-tracker';
import { gameTracker } from '#trackers/game-tracker';
import { tileTracker } from '#trackers/tile/tile-tracker';
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
                    runs: [{ trackers: [tileTracker()] }],
                    trackers: [tileTracker()],
                }),
            ),
        ).toThrow('Cannot set both runs and top-level trackers');
    });

    it('rejects filter without workers: false', () => {
        expect(() =>
            normalizeAnalyzeOptions(invalidAnalyzeOptions({ filter: () => true })),
        ).toThrow('filter requires workers: false');
    });

    it('allows filter with workers: false', () => {
        const { configs, multithreadCfg } = normalizeAnalyzeOptions({
            workers: false,
            filter: () => true,
        });
        expect(multithreadCfg).toBeNull();
        expect(configs[0]?.limits.filter).toBeDefined();
    });

    it('rejects filter in multi-run without workers: false', () => {
        expect(() =>
            normalizeAnalyzeOptions(
                invalidAnalyzeOptions({
                    runs: [{ filter: () => true }, { trackers: [tileTracker()] }],
                }),
            ),
        ).toThrow('filter requires workers: false');
    });

    it('parses headers when a filter is present', () => {
        const { parseHeaders } = normalizeAnalyzeOptions({ workers: false, filter: () => true });
        expect(parseHeaders).toBe(true);
    });

    it('throws when headers: false with a filter', () => {
        expect(() =>
            normalizeAnalyzeOptions(
                invalidAnalyzeOptions({
                    workers: false,
                    filter: () => true,
                    headers: false,
                }),
            ),
        ).toThrow('headers: false cannot be used when tag-pair headers are required');
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
            normalizeAnalyzeOptions(
                invalidAnalyzeOptions({
                    workers: false,
                    trackers: [gameTracker()],
                    headers: false,
                }),
            ),
        ).toThrow('headers: false cannot be used when tag-pair headers are required');
    });

    it('honors explicit headers: false when no game tracker', () => {
        const { parseHeaders } = normalizeAnalyzeOptions({ workers: false, headers: false });
        expect(parseHeaders).toBe(false);
    });

    it('sets replayMode from trackers by default', () => {
        const { configs } = normalizeAnalyzeOptions({
            workers: false,
            trackers: [tileTracker()],
        });
        expect(configs[0]?.replayMode).toBe('actions');
    });

    it('applies explicit replay override', () => {
        const { configs } = normalizeAnalyzeOptions({ workers: false, replay: 'board' });
        expect(configs[0]?.replayMode).toBe('board');
    });

    it('throws when move trackers conflict with replay override', () => {
        expect(() =>
            normalizeAnalyzeOptions(
                invalidAnalyzeOptions({
                    workers: false,
                    trackers: [tileTracker()],
                    replay: 'skip',
                }),
            ),
        ).toThrow('Move trackers require replay: "actions"');
    });

    it('sets parseHeaders when game tracker is present', () => {
        const { parseHeaders } = normalizeAnalyzeOptions({
            workers: false,
            trackers: [gameTracker()],
        });
        expect(parseHeaders).toBe(true);
    });

    it('normalizes maxGames on each config', () => {
        const { configs } = normalizeAnalyzeOptions({ workers: false, maxGames: 100 });
        expect(configs[0]?.limits.maxGames).toBe(100);
        expect(configs[0]?.limits.filter).toBeUndefined();
    });

    it('returns one normalized config per run', () => {
        const { configs } = normalizeAnalyzeOptions({ workers: false });
        expect(configs).toHaveLength(1);
    });

    it('does not require tracker metadata for single-threaded analysis', () => {
        const { configs } = normalizeAnalyzeOptions({
            workers: false,
            trackers: [tileTracker()],
        });
        expect(configs[0]?.trackerSpecs).toBeUndefined();
    });

    it('requires id for multithreaded analysis', () => {
        const tracker = defineMoveTracker({
            id: '',
            init: () => ({}),
            track: () => {},
            merge: () => {},
        });
        expect(() => normalizeAnalyzeOptions({ trackers: [tracker()] })).toThrow('non-empty id');
    });

    it('requires merge for multithreaded analysis', () => {
        const factory = defineMoveTracker({
            id: 'BareTracker',
            workerModule: import.meta.url,
            init: () => ({}),
            track: () => {},
            merge: () => {},
        });
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- strip merge to test runtime guard
        const def = factory.def as { merge?: (s: object, o: object) => void };
        delete def.merge;
        expect(() => normalizeAnalyzeOptions({ trackers: [factory()] })).toThrow(
            'must implement merge',
        );
    });

    it('threads tracker options to worker metadata', () => {
        const factory = defineMoveTracker<{ ok: boolean }, { minElo: number }>({
            id: 'opts-tracker',
            workerModule: import.meta.url,
            init: () => ({ ok: true }),
            track: () => {},
            merge: () => {},
        });
        const instance = factory({ minElo: 2000 });
        const { configs } = normalizeAnalyzeOptions({ trackers: [instance] });
        expect(configs[0]?.trackerSpecs).toEqual([
            { id: 'opts-tracker', module: import.meta.url, options: { minElo: 2000 } },
        ]);
    });

    it('rejects the same instance twice in one call', () => {
        const tiles = tileTracker();
        expect(() =>
            normalizeAnalyzeOptions({
                workers: false,
                trackers: [tiles, tiles],
            }),
        ).toThrow('appears more than once');
    });

    it('rejects the same instance across runs in one call', () => {
        const tiles = tileTracker();
        expect(() =>
            normalizeAnalyzeOptions({
                workers: false,
                runs: [{ trackers: [tiles] }, { trackers: [tiles] }],
            }),
        ).toThrow('appears more than once');
    });

    it('allows distinct instances of the same tracker', () => {
        const { configs } = normalizeAnalyzeOptions({
            workers: false,
            trackers: [tileTracker(), tileTracker()],
        });
        expect(configs[0]?.trackerHost.moveEntries).toHaveLength(2);
    });
});
