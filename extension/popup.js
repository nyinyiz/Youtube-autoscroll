document.addEventListener('DOMContentLoaded', () => {
    // --- i18n ---
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const msg = chrome.i18n.getMessage(el.dataset.i18n);
        if (msg) el.textContent = msg;
    });

    // Show platform-specific keyboard shortcut
    const isMac = /Mac/.test(navigator.platform);
    const keysEl = document.getElementById('shortcutKeys');
    keysEl.innerHTML = isMac
        ? '<span class="key">⌥⇧S</span>'
        : '<span class="key">Alt+⇧S</span>';

    // --- Elements ---
    const activeCheck    = document.getElementById('active');
    const slidersEl      = document.getElementById('sliders');
    const statusText     = document.getElementById('statusText');
    const delayRange     = document.getElementById('delay');
    const delayVal       = document.getElementById('delayVal');
    const thresholdRange = document.getElementById('threshold');
    const thresholdVal   = document.getElementById('thresholdVal');

    const msgActive = chrome.i18n.getMessage('statusActive') || 'Active on Shorts';
    const msgPaused = chrome.i18n.getMessage('statusPaused') || 'Paused';

    function applyState(isActive) {
        slidersEl.classList.toggle('dimmed', !isActive);
        statusText.textContent = isActive ? ('● ' + msgActive) : ('○ ' + msgPaused);
        statusText.className = 'toggle-status ' + (isActive ? 'on' : 'off');
    }

    // --- Load saved state ---
    chrome.storage.local.get(['active', 'delay', 'threshold'], (result) => {
        const isActive = result.active || false;
        activeCheck.checked = isActive;
        applyState(isActive);

        if (result.delay !== undefined) {
            delayRange.value = result.delay;
            delayVal.textContent = parseFloat(result.delay).toFixed(1);
        }
        if (result.threshold !== undefined) {
            thresholdRange.value = result.threshold;
            thresholdVal.textContent = parseFloat(result.threshold).toFixed(1);
        }
    });

    // --- Send state to content script ---
    function sendUpdate(state) {
        chrome.storage.local.set(state);
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]?.id) {
                chrome.tabs.sendMessage(tabs[0].id, { type: 'UPDATE_STATE', ...state }).catch(() => {});
            }
        });
    }

    // --- Listeners ---
    activeCheck.addEventListener('change', () => {
        const isActive = activeCheck.checked;
        applyState(isActive);
        sendUpdate({
            active: isActive,
            delay: parseFloat(delayRange.value),
            threshold: parseFloat(thresholdRange.value),
        });
    });

    delayRange.addEventListener('input', () => {
        delayVal.textContent = parseFloat(delayRange.value).toFixed(1);
        sendUpdate({
            active: activeCheck.checked,
            delay: parseFloat(delayRange.value),
            threshold: parseFloat(thresholdRange.value),
        });
    });

    thresholdRange.addEventListener('input', () => {
        thresholdVal.textContent = parseFloat(thresholdRange.value).toFixed(1);
        sendUpdate({
            active: activeCheck.checked,
            delay: parseFloat(delayRange.value),
            threshold: parseFloat(thresholdRange.value),
        });
    });
});
