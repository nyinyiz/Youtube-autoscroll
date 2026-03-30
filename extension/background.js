// Handles the Alt+Shift+S keyboard shortcut command.
// Flips the active state in storage and notifies any open Shorts tabs.

chrome.commands.onCommand.addListener((command) => {
    if (command !== 'toggle-active') return;

    chrome.storage.local.get(['active', 'delay', 'threshold'], (result) => {
        const newActive = !result.active;
        const state = {
            active: newActive,
            delay: result.delay ?? 0,
            threshold: result.threshold ?? 0.5,
        };
        chrome.storage.local.set({ active: newActive });

        // Notify all open Shorts tabs
        chrome.tabs.query({ url: 'https://www.youtube.com/shorts/*' }, (tabs) => {
            for (const tab of tabs) {
                if (tab.id) {
                    chrome.tabs.sendMessage(tab.id, { type: 'UPDATE_STATE', ...state }).catch(() => {});
                }
            }
        });
    });
});
