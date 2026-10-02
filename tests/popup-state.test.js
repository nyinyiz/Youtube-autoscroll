const assert = require('assert');

const {
    DEFAULT_SETTINGS,
    buildStoredState,
    resetTimingSettings,
} = require('../extension/popup-state.js');

assert.deepStrictEqual(
    buildStoredState({}),
    {
        active: false,
        delay: DEFAULT_SETTINGS.delay,
        threshold: DEFAULT_SETTINGS.threshold,
    },
    'missing stored values fall back to defaults',
);

assert.deepStrictEqual(
    resetTimingSettings({ active: true, delay: 4, threshold: 2.2 }),
    {
        active: true,
        delay: DEFAULT_SETTINGS.delay,
        threshold: DEFAULT_SETTINGS.threshold,
    },
    'resetting settings keeps the current active state',
);

console.log('popup-state tests passed');
