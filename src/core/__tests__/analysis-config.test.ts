import { describe, expect, it } from 'bun:test';

import { normalizeAnalysisConfigs } from '#core/analysis-config';
import { GameTracker } from '#trackers/game-tracker';
import { TileTracker } from '#trackers/tile/tile-tracker';
import type { AnalysisConfig } from '#types/analysis-runtime';

describe('normalizeAnalysisConfigs', () => {
    const baseCfg: AnalysisConfig = { trackers: [] };

    it('sets parseHeaders when filter is present', () => {
        const { parseHeaders } = normalizeAnalysisConfigs(
            [{ ...baseCfg, config: { filter: () => true } }],
            {},
        );
        expect(parseHeaders).toBe(true);
    });

    it('sets parseHeaders false when maxGames is finite without filter', () => {
        const { parseHeaders } = normalizeAnalysisConfigs(
            [{ ...baseCfg, config: { maxGames: 10 } }],
            {},
        );
        expect(parseHeaders).toBe(false);
    });

    it('honors explicit headers: true', () => {
        const { parseHeaders } = normalizeAnalysisConfigs([baseCfg], {}, { headers: true });
        expect(parseHeaders).toBe(true);
    });

    it('forces headers when filter needs them even if headers: false', () => {
        const { parseHeaders } = normalizeAnalysisConfigs(
            [{ ...baseCfg, config: { filter: () => true } }],
            {},
            { headers: false },
        );
        expect(parseHeaders).toBe(true);
    });

    it('honors explicit headers: false when no filter or game tracker', () => {
        const { parseHeaders } = normalizeAnalysisConfigs([baseCfg], {}, { headers: false });
        expect(parseHeaders).toBe(false);
    });

    it('sets replayMode from trackers by default', () => {
        const { configs } = normalizeAnalysisConfigs([{ trackers: [new TileTracker()] }], {});
        expect(configs[0]?.replayMode).toBe('actions');
    });

    it('applies explicit replay override', () => {
        const { configs } = normalizeAnalysisConfigs([baseCfg], {}, { replay: 'board' });
        expect(configs[0]?.replayMode).toBe('board');
    });

    it('throws when move trackers conflict with replay override', () => {
        expect(() =>
            normalizeAnalysisConfigs([{ trackers: [new TileTracker()] }], {}, { replay: 'skip' }),
        ).toThrow('Move trackers require replay: "actions"');
    });

    it('sets parseHeaders when game tracker is present', () => {
        const { parseHeaders } = normalizeAnalysisConfigs([{ trackers: [new GameTracker()] }], {});
        expect(parseHeaders).toBe(true);
    });

    it('normalizes maxGames on each config', () => {
        const { configs } = normalizeAnalysisConfigs(
            [{ ...baseCfg, config: { maxGames: 100 } }],
            {},
        );
        expect(configs[0]?.config.maxGames).toBe(100);
        expect(configs[0]?.config.hasFilter).toBe(false);
    });

    it('marks hasFilter when a user filter is provided', () => {
        const { configs } = normalizeAnalysisConfigs(
            [{ ...baseCfg, config: { filter: (g) => g.Result === '1-0' } }],
            {},
        );
        expect(configs[0]?.config.hasFilter).toBe(true);
    });

    it('returns configs for multithreaded and single-threaded runs', () => {
        const mt = normalizeAnalysisConfigs([baseCfg], {});
        const st = normalizeAnalysisConfigs([baseCfg], null);
        expect(mt.configs).toHaveLength(1);
        expect(st.configs).toHaveLength(1);
    });
});
