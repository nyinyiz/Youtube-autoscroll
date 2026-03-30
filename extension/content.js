(() => {
    let active = false;
    let delay = 0;
    let threshold = 0.5;
    let navigating = false;

    chrome.storage.local.get(['active', 'delay', 'threshold'], (result) => {
        active    = result.active    ?? false;
        delay     = result.delay     ?? 0;
        threshold = result.threshold ?? 0.5;
    });

    chrome.runtime.onMessage.addListener((request) => {
        if (request.type === 'UPDATE_STATE') {
            active    = request.active;
            delay     = request.delay     ?? 0;
            threshold = request.threshold ?? 0.5;
        }
    });

    function goToNextShort() {
        if (!active || navigating) return;
        navigating = true;
        setTimeout(() => { navigating = false; }, 2000);

        setTimeout(() => {
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
            if (!video.duration) return;
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

    const observer = new MutationObserver(() => {
        document.querySelectorAll('video').forEach(attachVideoListener);
    });

    observer.observe(document.body, { childList: true, subtree: true });
    document.querySelectorAll('video').forEach(attachVideoListener);
})();
