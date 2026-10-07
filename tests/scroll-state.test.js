const assert = require('assert');

const {
    DEFAULT_SETTINGS,
    MAX_ATTEMPTS,
    RETRY_MS,
    settingsFromStorage,
    settingsFromChanges,
    nextAction,
} = require('../extension/scroll-state.js');

// ---------------------------------------------------------------------------
// RC1: storage.onChanged delivers {key: {oldValue, newValue}}, not raw values.
// ---------------------------------------------------------------------------

assert.deepStrictEqual(
    settingsFromStorage({}),
    DEFAULT_SETTINGS,
    'missing stored values fall back to defaults',
);

assert.deepStrictEqual(
    settingsFromStorage({ active: true, delay: 1.5, threshold: 2 }),
    { active: true, delay: 1.5, threshold: 2 },
    'storage.local.get hands over raw values',
);

assert.deepStrictEqual(
    settingsFromChanges({ active: { oldValue: true, newValue: false } }, { active: true, delay: 1, threshold: 2 }),
    { active: false, delay: 1, threshold: 2 },
    'unchecking the toggle must actually deactivate (not store a truthy change record)',
);

assert.deepStrictEqual(
    settingsFromChanges({ delay: { oldValue: 0, newValue: 1.5 } }, DEFAULT_SETTINGS),
    { active: false, delay: 1.5, threshold: DEFAULT_SETTINGS.threshold },
    'a slider change unwraps newValue and leaves untouched keys alone',
);

assert.deepStrictEqual(
    settingsFromChanges({ somethingElse: { newValue: 1 } }, DEFAULT_SETTINGS),
    DEFAULT_SETTINGS,
    'unrelated keys never disturb settings',
);

// A change record must never leak a non-number into the timing math.
const leaked = settingsFromChanges({ threshold: { oldValue: 0.5, newValue: 1 } }, DEFAULT_SETTINGS);
assert.strictEqual(typeof leaked.threshold, 'number', 'threshold stays a number');
assert.strictEqual(typeof leaked.delay, 'number', 'delay stays a number');

// Corrupt/garbage storage values must not poison the math either.
assert.deepStrictEqual(
    settingsFromStorage({ active: 1, delay: 'x', threshold: null }),
    { active: true, delay: 0, threshold: DEFAULT_SETTINGS.threshold },
    'non-numeric stored values fall back instead of producing NaN',
);

// ---------------------------------------------------------------------------
// nextAction: the scheduling decision
// ---------------------------------------------------------------------------

const ON = { active: true, delay: 0, threshold: 0.5 };
const shorts = '/shorts/abc12345678';
const base = {
    settings: ON, path: shorts, duration: 30, currentTime: 0,
    paused: false, loops: 0, latch: null, now: 1000,
};
const act = (over) => nextAction({ ...base, ...over });

assert.strictEqual(act({ settings: { ...ON, active: false } }).type, 'idle',
    'inactive means idle');
assert.strictEqual(act({ path: '/feed/subscriptions' }).type, 'idle',
    'idles off the Shorts route so one script can cover the whole SPA');

// RC3: duration is NaN for a window after navigation; keep waiting, never wedge.
assert.strictEqual(act({ duration: NaN }).type, 'wait', 'NaN duration waits for metadata');
assert.strictEqual(act({ duration: 0 }).type, 'wait', 'zero duration waits for metadata');
assert.strictEqual(act({ duration: Infinity }).type, 'wait', 'live/unknown duration waits');

assert.strictEqual(act({ currentTime: 10 }).type, 'wait', 'mid-video waits');
assert.strictEqual(act({ currentTime: 29.5 }).type, 'fire', 'fires at duration - threshold');
assert.strictEqual(act({ currentTime: 29.9 }).type, 'fire', 'fires past the trigger point');

// RC4: a paused short must never scroll away under the user.
assert.strictEqual(act({ currentTime: 29.9, paused: true }).type, 'wait',
    'paused at the trigger point does not fire');

// "Hold afterwards" pushes the trigger later, and may land beyond the end.
assert.strictEqual(act({ settings: { ...ON, delay: 2 }, currentTime: 29.9 }).type, 'wait',
    'delay holds past the plain trigger point');
assert.strictEqual(act({ settings: { ...ON, delay: 2 }, currentTime: 1.6, loops: 1 }).type, 'fire',
    'a delay longer than the remainder fires after the loop wraps');

// ---------------------------------------------------------------------------
// RC5: a failed click retries after a real cooldown, then gives up.
// ---------------------------------------------------------------------------

const fired = { path: shorts, attempts: 1, lastFiredAt: 1000 };
assert.strictEqual(act({ currentTime: 29.9, latch: fired, now: 1500 }).type, 'wait',
    'inside the cooldown it waits rather than click-spamming');
assert.strictEqual(act({ currentTime: 29.9, latch: fired, now: 1000 + RETRY_MS }).type, 'fire',
    'retries once the cooldown has actually elapsed');
assert.strictEqual(
    act({ currentTime: 29.9, latch: { path: shorts, attempts: MAX_ATTEMPTS, lastFiredAt: 0 } }).type,
    'exhausted',
    'gives up after MAX_ATTEMPTS instead of clicking forever',
);

// A new short clears a latch left over from the previous one — including an
// exhausted one. This is the bug that used to need a tab reload.
assert.strictEqual(
    act({ currentTime: 29.9, latch: { path: '/shorts/zzzzzzzzzzz', attempts: MAX_ATTEMPTS, lastFiredAt: 0 } }).type,
    'fire',
    'a stale latch from another short never blocks the current one',
);

console.log('scroll-state tests passed');
