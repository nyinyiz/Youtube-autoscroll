(function (root, factory) {
    const api = factory();

    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    } else {
        root.AutoScrollContentState = api;
    }
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
    const DEFAULT_SETTINGS = {
        active: false,
        delay: 0,
        threshold: 0.5,
    };

    function buildSettings(source = {}) {
        return {
            active: source.active ?? DEFAULT_SETTINGS.active,
            delay: source.delay ?? DEFAULT_SETTINGS.delay,
            threshold: source.threshold ?? DEFAULT_SETTINGS.threshold,
        };
    }

    function isShortsPath(path) {
        return String(path || '').startsWith('/shorts/');
    }

    return {
        DEFAULT_SETTINGS,
        buildSettings,
        isShortsPath,
    };
});
