import { describe, it, expect } from 'bun:test';

import { getCachedCfg, initWorkerTrackers } from '#core/worker-tracker-registry';

describe('worker-tracker-registry', () => {
    it('throws on unknown tracker at worker init', () => {
        return expect(
            initWorkerTrackers({
                configs: [
                    {
                        trackerData: [
                            { id: 'DoesNotExist', cfg: { profilingActive: false }, path: '' },
                        ],
                    },
                ],
            }),
        ).rejects.toThrow('Unknown tracker "DoesNotExist"');
    });

    it('throws on invalid analysis config index', async () => {
        await initWorkerTrackers({
            configs: [{ trackerData: [] }],
        });

        expect(() => getCachedCfg(99)).toThrow('Invalid analysis config index: 99');
    });
});
