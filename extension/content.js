(() => {
    let state = { active: false, delay: 0, threshold: 0.5 };
    let timer = null;
    let tries = 0;

    function read(source) {
        return {
            active:    source.active    ?? state.active,
            delay:     source.delay     ?? state.delay,
            threshold: source.threshold ?? state.threshold,
        };
    }

    function schedule(video, extra = 0) {
        clearTimeout(timer);
        if (!state.active || !video || !video.duration) return;

        const wait = (video.duration - video.currentTime - state.threshold + state.delay) * 1000 + extra;

        timer = setTimeout(() => {
            document.querySelector('#navigation-button-down button')?.click();
            if (++tries < 3) schedule(video, 2500);
        }, Math.max(0, wait));
    }

    chrome.storage.local.get(['active', 'delay', 'threshold'], (result) => {
        state = read(result);
        schedule(document.querySelector('#shorts-player video'));
    });

    chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== 'local') return;
        state = read(changes);
        schedule(document.querySelector('#shorts-player video'));
    });

    // Fires once per short, at currentTime 0, with duration already known.
    // loadedmetadata does not bubble, so listen in the capture phase.
    document.addEventListener('loadedmetadata', (event) => {
        if (event.target.tagName !== 'VIDEO') return;
        tries = 0;
        schedule(event.target);
    }, true);
})();
