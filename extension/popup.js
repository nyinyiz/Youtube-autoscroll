document.addEventListener('DOMContentLoaded', () => {
    const { buildStoredState, resetTimingSettings, DEFAULT_SETTINGS } = window.AutoScrollSettings;

    // --- i18n ---
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const msg = chrome.i18n.getMessage(el.dataset.i18n);
        if (msg) el.textContent = msg;
    });

    // --- Elements ---
    const activeCheck    = document.getElementById('active');
    const statusEl       = document.getElementById('statusText');
    const statusLabel    = document.getElementById('statusLabel');
    const delayRange     = document.getElementById('delay');
    const delayVal       = document.getElementById('delayVal');
    const thresholdRange = document.getElementById('threshold');
    const thresholdVal   = document.getElementById('thresholdVal');
    const resetSettings  = document.getElementById('resetSettings');
    const advancedToggle = document.getElementById('advancedToggle');
    const advancedBody   = document.getElementById('advancedBody');

    const msgActive = chrome.i18n.getMessage('statusActive') || 'Active on Shorts';
    const msgPaused = chrome.i18n.getMessage('statusPaused') || 'Paused';

    // Keyboard cap, with an accessible name since the glyph alone says nothing
    const isMac = /Mac/.test(navigator.platform);
    const keysEl = document.getElementById('shortcutKeys');
    keysEl.textContent = isMac ? '⌥⇧S' : 'Alt+⇧S';
    const shortcutName = chrome.i18n.getMessage('shortcutLabel');
    if (shortcutName) {
        keysEl.title = shortcutName;
        keysEl.setAttribute('aria-label', shortcutName);
    }

    // --- Render ---
    function paintRange(range, valueEl, raw) {
        const value = parseFloat(raw);
        valueEl.textContent = value.toFixed(1);
        const min = parseFloat(range.min), max = parseFloat(range.max);
        range.style.setProperty('--pct', ((value - min) / (max - min)) * 100 + '%');
    }

    function applyState(isActive) {
        statusEl.classList.toggle('on', isActive);
        statusLabel.textContent = isActive ? msgActive : msgPaused;
    }

    function applyTimingControls(state) {
        delayRange.value = state.delay;
        thresholdRange.value = state.threshold;
        paintRange(delayRange, delayVal, state.delay);
        paintRange(thresholdRange, thresholdVal, state.threshold);
        const isDefault =
            parseFloat(state.delay) === DEFAULT_SETTINGS.delay &&
            parseFloat(state.threshold) === DEFAULT_SETTINGS.threshold;
        resetSettings.disabled = isDefault;
    }

    function render(state) {
        activeCheck.checked = state.active;
        applyState(state.active);
        applyTimingControls(state);
    }

    // Single source of truth: persist, never message the tab
    function persist(partial) {
        chrome.storage.local.set({
            active: activeCheck.checked,
            delay: parseFloat(delayRange.value),
            threshold: parseFloat(thresholdRange.value),
            ...partial,
        });
    }

    // --- Load saved state ---
    chrome.storage.local.get(['active', 'delay', 'threshold'], (result) => {
        render(buildStoredState(result));
    });

    // --- Listeners ---
    activeCheck.addEventListener('change', () => {
        applyState(activeCheck.checked);
        persist();
    });

    delayRange.addEventListener('input', () => {
        paintRange(delayRange, delayVal, delayRange.value);
        resetSettings.disabled = false;
        persist();
    });

    thresholdRange.addEventListener('input', () => {
        paintRange(thresholdRange, thresholdVal, thresholdRange.value);
        resetSettings.disabled = false;
        persist();
    });

    advancedToggle.addEventListener('click', () => {
        const open = advancedToggle.getAttribute('aria-expanded') === 'true';
        advancedToggle.setAttribute('aria-expanded', String(!open));
        advancedBody.classList.toggle('open', !open);
        // Reset lives inside the panel, so its state only matters while visible
        if (!open) resetSettings.focus();
    });

    resetSettings.addEventListener('click', () => {
        const state = resetTimingSettings({ active: activeCheck.checked });
        applyTimingControls(state);
        persist({ delay: state.delay, threshold: state.threshold });
    });

    // Registered last so a failure here cannot leave the popup unwired.
    // The keyboard shortcut writes to storage while this popup may be open;
    // reflect that instead of showing a stale toggle.
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== 'local') return;
        if (!('active' in changes) && !('delay' in changes) && !('threshold' in changes)) return;
        chrome.storage.local.get(['active', 'delay', 'threshold'], (result) => {
            render(buildStoredState(result));
        });
    });
});