(function (root, factory) {
    const api = factory();

    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    } else {
        root.AutoScrollSettings = api;
    }
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
    const DEFAULT_SETTINGS = {
        active: false,
        delay: 0,
        threshold: 0.5,
    };

    function buildStoredState(result = {}) {
        return {
            active: result.active ?? DEFAULT_SETTINGS.active,
            delay: result.delay ?? DEFAULT_SETTINGS.delay,
            threshold: result.threshold ?? DEFAULT_SETTINGS.threshold,
        };
    }

    function resetTimingSettings(currentState = {}) {
        return {
            active: currentState.active ?? DEFAULT_SETTINGS.active,
            delay: DEFAULT_SETTINGS.delay,
            threshold: DEFAULT_SETTINGS.threshold,
        };
    }

    return {
        DEFAULT_SETTINGS,
        buildStoredState,
        resetTimingSettings,
    };
});
