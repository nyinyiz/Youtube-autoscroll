// Handles the Alt+Shift+S keyboard shortcut command.
// Flips the active state in storage; open Shorts tabs pick it up
// via chrome.storage.onChanged, so there is no tab fan-out here.

chrome.commands.onCommand.addListener((command) => {
    if (command !== 'toggle-active') return;

    chrome.storage.local.get('active', (result) => {
        chrome.storage.local.set({ active: !result.active });
    });
});
