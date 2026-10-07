// Pure scheduling logic for the Shorts auto-scroll, kept free of DOM and
// chrome.* so it can be unit tested. content.js supplies the observations and
// performs the click; everything decided here is a function of its arguments.
(function (root, factory) {
    const api = factory();

    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    } else {
        root.AutoScrollState = api;
    }
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
    const DEFAULT_SETTINGS = {
        active: false,
        delay: 0,
        threshold: 0.5,
    };

    // A click can land before YouTube has wired up the next short. Retry a
    // couple of times on a real wall-clock cooldown, then stop: clicking
    // forever on a page that will never advance just burns CPU.
    const MAX_ATTEMPTS = 3;
    const RETRY_MS = 2500;

    const SHORTS_PATH = /^\/shorts\/[\w-]+/;

    // Number(null) and Number('') are 0, which would silently pass for a real
    // setting, so only an actual number or a numeric string counts.
    function num(value, fallback) {
        const n = typeof value === 'number' ? value
            : typeof value === 'string' && value.trim() !== '' ? Number(value)
            : NaN;
        return Number.isFinite(n) && n >= 0 ? n : fallback;
    }

    // chrome.storage.local.get hands back raw values: {active: true, delay: 1.5}
    function settingsFromStorage(result = {}) {
        return {
            active: Boolean(result.active ?? DEFAULT_SETTINGS.active),
            delay: num(result.delay, DEFAULT_SETTINGS.delay),
            threshold: num(result.threshold, DEFAULT_SETTINGS.threshold),
        };
    }

    // chrome.storage.onChanged hands back change records keyed by name:
    // {active: {oldValue, newValue}}. Unwrapping these is the whole point of
    // keeping the two boundaries apart — feeding one shape to the other's
    // reader stored change objects where numbers belonged, which turned the
    // timing math into NaN and made `active` permanently truthy.
    function settingsFromChanges(changes = {}, current = DEFAULT_SETTINGS) {
        const unwrap = (key) =>
            key in changes ? changes[key].newValue : current[key];

        return settingsFromStorage({
            active: unwrap('active'),
            delay: unwrap('delay'),
            threshold: unwrap('threshold'),
        });
    }

    function isShortsPath(path) {
        return typeof path === 'string' && SHORTS_PATH.test(path);
    }

    // Decides what content.js should do right now, from live observations
    // rather than from a deadline computed once and trusted forever.
    //
    // `loops` counts how many times the short has restarted — Shorts sets
    // video.loop, so currentTime alone cannot tell "about to end" from
    // "already ended and came back around".
    function nextAction({
        settings = DEFAULT_SETTINGS,
        path,
        duration,
        currentTime = 0,
        paused = false,
        loops = 0,
        latch = null,
        now = 0,
    } = {}) {
        if (!settings.active) return { type: 'idle', reason: 'inactive' };
        if (!isShortsPath(path)) return { type: 'idle', reason: 'off-route' };

        // NaN until metadata arrives, Infinity for an unknown length. Keep
        // polling: the old code returned silently here and, because its only
        // re-arm was a loadedmetadata event that had often already fired,
        // never looked again.
        if (!Number.isFinite(duration) || duration <= 0) {
            return { type: 'wait', reason: 'no-duration' };
        }

        // Trigger `threshold` seconds before the end, then hold for `delay`.
        // A long hold can push the trigger past the end of the short, which is
        // why this is measured in total elapsed time across loops.
        const target = Math.max(0, duration - settings.threshold) + settings.delay;
        const elapsed = loops * duration + currentTime;

        if (elapsed < target) return { type: 'wait', reason: 'before-target' };

        // Deliberately after the target check: a user who pauses near the end
        // should not have the short scroll away under them.
        if (paused) return { type: 'wait', reason: 'paused' };

        const attempts = latch && latch.path === path ? latch.attempts : 0;
        const lastFiredAt = latch && latch.path === path ? latch.lastFiredAt : 0;

        if (attempts >= MAX_ATTEMPTS) return { type: 'exhausted', reason: 'max-attempts' };
        if (attempts > 0 && now - lastFiredAt < RETRY_MS) {
            return { type: 'wait', reason: 'cooldown' };
        }

        return { type: 'fire', reason: attempts > 0 ? 'retry' : 'target-reached', attempts };
    }

    return {
        DEFAULT_SETTINGS,
        MAX_ATTEMPTS,
        RETRY_MS,
        settingsFromStorage,
        settingsFromChanges,
        isShortsPath,
        nextAction,
    };
});
