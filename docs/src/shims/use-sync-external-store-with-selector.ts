// Bare specifier without alias (`.js` suffix). Vite prebundles this for CJS interop.
// @ts-expect-error No declaration file for this module.
import withSelector from 'use-sync-external-store/shim/with-selector.js';

export const useSyncExternalStoreWithSelector = withSelector.useSyncExternalStoreWithSelector;
