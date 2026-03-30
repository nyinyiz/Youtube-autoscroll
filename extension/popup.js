document.addEventListener('DOMContentLoaded', () => {
    const activeCheck = document.getElementById('active');
    const autoEnableCheck = document.getElementById('autoEnable');
    const delayRange = document.getElementById('delay');
    const delayVal = document.getElementById('delayVal');
    const thresholdRange = document.getElementById('threshold');
    const thresholdVal = document.getElementById('thresholdVal');

    // Load saved state
    chrome.storage.local.get(['active', 'autoEnable', 'delay', 'threshold'], (result) => {
        if (result.active !== undefined) activeCheck.checked = result.active;
        if (result.autoEnable !== undefined) autoEnableCheck.checked = result.autoEnable;
        if (result.delay !== undefined) {
            delayRange.value = result.delay;
            delayVal.innerText = parseFloat(result.delay).toFixed(1);
        }
        if (result.threshold !== undefined) {
            thresholdRange.value = result.threshold;
            thresholdVal.innerText = parseFloat(result.threshold).toFixed(1);
        }
        updateContent();
    });

    function updateContent() {
        const state = {
            active: activeCheck.checked,
            autoEnable: autoEnableCheck.checked,
            delay: parseFloat(delayRange.value),
            threshold: parseFloat(thresholdRange.value),
        };

        delayVal.innerText = state.delay.toFixed(1);
        thresholdVal.innerText = state.threshold.toFixed(1);

        chrome.storage.local.set(state);

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0] && tabs[0].id) {
                chrome.tabs.sendMessage(tabs[0].id, { type: "UPDATE_STATE", ...state }).catch(() => {});
            }
        });
    }

    activeCheck?.addEventListener('change', updateContent);
    autoEnableCheck?.addEventListener('change', updateContent);
    delayRange?.addEventListener('input', updateContent);
    thresholdRange?.addEventListener('input', updateContent);
});
