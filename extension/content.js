(() => {
    const { buildSettings, isShortsPath } = globalThis.AutoScrollContentState;

    let active = false;
    let delay = 0;
    let threshold = 0.5;
    let navigating = false;
    let lastPath = location.pathname;

    chrome.storage.local.get(['active', 'delay', 'threshold'], (result) => {
        applySettings(result);
    });

    chrome.runtime.onMessage.addListener((request) => {
        if (request.type === 'UPDATE_STATE') {
            applySettings(request);
        }
    });

    chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName !== 'local') return;
        if (!changes.active && !changes.delay && !changes.threshold) return;

        applySettings({
            active: changes.active ? changes.active.newValue : active,
            delay: changes.delay ? changes.delay.newValue : delay,
            threshold: changes.threshold ? changes.threshold.newValue : threshold,
        });
    });

    function applySettings(source) {
        const settings = buildSettings(source);
        active = settings.active;
        delay = settings.delay;
        threshold = settings.threshold;
    }

    function isShortsPage() {
        return isShortsPath(location.pathname);
    }

    function goToNextShort() {
        if (!active || navigating || !isShortsPage()) return;
        navigating = true;
        setTimeout(() => { navigating = false; }, 2000);

        setTimeout(() => {
            if (!active || !isShortsPage()) return;

            const nextBtn = document.querySelector('#navigation-button-down button');
            if (nextBtn) {
                nextBtn.click();
                return;
            }
            document.dispatchEvent(new KeyboardEvent('keydown', {
                key: 'ArrowDown',
                keyCode: 40,
                which: 40,
                bubbles: true,
                cancelable: true,
            }));
        }, delay * 1000);
    }

    function attachVideoListener(video) {
        if (video._autoScrollAttached) return;
        video._autoScrollAttached = true;

        let triggered = false;

        video.addEventListener('timeupdate', () => {
            if (!isShortsPage() || !video.duration) return;
            const remaining = video.duration - video.currentTime;
            if (remaining <= threshold && !triggered) {
                triggered = true;
                goToNextShort();
            }
            if (video.currentTime < 0.5 && triggered) {
                triggered = false;
            }
        });
    }

    function attachAllVideoListeners() {
        document.querySelectorAll('video').forEach(attachVideoListener);
    }

    function resetNavigationStateOnUrlChange() {
        if (location.pathname === lastPath) return;

        lastPath = location.pathname;
        navigating = false;
        attachAllVideoListeners();
    }

    const observer = new MutationObserver(() => {
        resetNavigationStateOnUrlChange();
        attachAllVideoListeners();
    });

    observer.observe(document.documentElement, { childList: true, subtree: true });
    attachAllVideoListeners();
})();
