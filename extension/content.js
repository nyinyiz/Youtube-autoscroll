(() => {
    const {
        DEFAULT_SETTINGS,
        settingsFromStorage,
        settingsFromChanges,
        isShortsPath,
        nextAction,
    } = window.AutoScrollState;

    // Shorts reuses one <video> and sets video.loop, so there is no `ended`
    // event and no second `loadedmetadata` to re-arm on. Rather than compute a
    // deadline once and trust it, sample the player: a poll re-reads reality,
    // so pausing, seeking, buffering, a changed playback rate and background
    // tab throttling all correct themselves on the next tick.
    const TICK_MS = 150;

    let settings = DEFAULT_SETTINGS;
    let ticker = null;

    // Per-short progress tracking. `loops` is what lets us tell "about to end"
    // apart from "already ended and looped back to the start".
    let path = null;
    let loops = 0;
    let lastTime = 0;
    let latch = null;

    function resetProgress(nextPath) {
        path = nextPath;
        loops = 0;
        lastTime = 0;
        latch = null;
    }

    function video() {
        return document.querySelector('#shorts-player video');
    }

    function tick() {
        if (location.pathname !== path) resetProgress(location.pathname);

        const el = video();
        const duration = el ? el.duration : NaN;
        const currentTime = el ? el.currentTime : 0;

        // Count a wrap only from near the end, so a user scrubbing backwards is
        // not mistaken for the short having completed a lap.
        if (el && Number.isFinite(duration) && currentTime < lastTime &&
            lastTime > duration - 1) {
            loops += 1;
        }
        lastTime = currentTime;

        const action = nextAction({
            settings,
            path: location.pathname,
            duration,
            currentTime,
            paused: el ? el.paused : true,
            loops,
            latch,
            now: Date.now(),
        });

        if (action.type !== 'fire') return;

        latch = { path: location.pathname, attempts: action.attempts + 1, lastFiredAt: Date.now() };
        document.querySelector('#navigation-button-down button')?.click();
    }

    function sync() {
        // Only poll while switched on; the tick itself handles being on a
        // non-Shorts route, which is how one injection covers SPA navigation.
        if (settings.active && !ticker) {
            resetProgress(location.pathname);
            ticker = setInterval(tick, TICK_MS);
        } else if (!settings.active && ticker) {
            clearInterval(ticker);
            ticker = null;
        }
    }

    chrome.storage.local.get(['active', 'delay', 'threshold'], (result) => {
        settings = settingsFromStorage(result);
        sync();
    });

    chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== 'local') return;
        settings = settingsFromChanges(changes, settings);
        sync();
    });
})();
