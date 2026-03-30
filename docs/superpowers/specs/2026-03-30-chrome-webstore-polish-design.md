# Chrome Web Store Polish — Design Spec
Date: 2026-03-30

## Goal
Bring the YouTube Auto-Scroll extension to Chrome Web Store publication standard: correct manifest metadata, professional icons, simplified UX, i18n support, and keyboard shortcut.

---

## 1. Manifest Fixes

- **Name**: "YouTube Shorts Auto-Scroll"
- **Description**: Use i18n key `__MSG_extDescription__`
- **Default locale**: `en`
- **Remove**: `web_accessible_resources` (WASM is no longer used)
- **Remove**: `wasm-unsafe-eval` from CSP (no longer needed)
- **Add**: `icons` block with 16, 48, 128px PNG paths
- **Add**: `action.default_icon` block
- **Add**: `commands` block for keyboard shortcut `Alt+Shift+S`

---

## 2. Icons

Design: dark rounded square (`#0f0f0f`), red circle (`#cc0000`) containing white play triangle, white scroll chevron below the circle.

Sizes: `icons/icon16.png`, `icons/icon48.png`, `icons/icon128.png`

Generated via Python script (`generate_icons.py`) using Pillow. Script lives at project root and is run once as part of setup.

---

## 3. Popup UI — Clean Light, Single Toggle

**Removed**: `Active` checkbox, `Auto-enable on Shorts` checkbox, `Scroll Speed` slider (unused).

**Added**: Single `Auto-scroll` toggle (replaces both checkboxes).

**Layout** (top to bottom):
1. Header — icon + "YouTube Auto-Scroll" title
2. Single toggle row — label "Auto-scroll" + status subtext ("● Active on Shorts" green / "○ Paused" grey) + red/grey toggle switch
3. Divider
4. Slider — "Delay before next" (0–5s, step 0.5) — dimmed when toggle is OFF
5. Slider — "Trigger early" (0.1–3s, step 0.1) — dimmed when toggle is OFF
6. Footer bar — "Toggle shortcut" label + `⌥⇧S` / `Alt+⇧S` key chips

**Storage keys**: `active` (bool), `delay` (float), `threshold` (float)

---

## 4. content.js Changes

- Remove `autoEnable` state entirely
- On load: read `active`, `delay`, `threshold` from storage
- Handle `UPDATE_STATE` message with `active`, `delay`, `threshold`
- Handle `toggle-active` command message from background (keyboard shortcut)

---

## 5. Background Script (new: `background.js`)

Needed to handle the `commands` API for keyboard shortcut:
- Listen for `chrome.commands.onCommand` → `toggle-active`
- Read current `active` state from storage, flip it, write back
- Send `UPDATE_STATE` message to active Shorts tab

Add `"background": { "service_worker": "background.js" }` to manifest.

---

## 6. i18n — `_locales`

Languages: `en`, `es`, `pt`, `ja`, `ko`, `hi`

Keys per locale:
- `extName` — extension name
- `extDescription` — store description
- `toggleCommand` — keyboard command description
- `popupTitle` — popup header
- `autoScrollLabel` — toggle label
- `statusActive` — "Active on Shorts"
- `statusPaused` — "Paused"
- `delayLabel` — "Delay before next"
- `triggerLabel` — "Trigger early"
- `shortcutLabel` — "Toggle shortcut"

Popup JS uses `chrome.i18n.getMessage()` to populate all strings at runtime.

---

## 7. Files Changed / Added

| File | Action |
|------|--------|
| `manifest.json` | Update — name, icons, commands, background, remove WASM, fix CSP, add default_locale |
| `extension/popup.html` | Rewrite — new single-toggle clean light UI |
| `extension/popup.js` | Rewrite — i18n strings, single toggle, dim sliders |
| `extension/content.js` | Update — remove autoEnable, handle toggle command |
| `extension/background.js` | New — keyboard shortcut handler |
| `extension/icons/` | New — icon16.png, icon48.png, icon128.png |
| `extension/_locales/en/messages.json` | New |
| `extension/_locales/es/messages.json` | New |
| `extension/_locales/pt/messages.json` | New |
| `extension/_locales/ja/messages.json` | New |
| `extension/_locales/ko/messages.json` | New |
| `extension/_locales/hi/messages.json` | New |
| `generate_icons.py` | New — icon generator script |
| `extension/pkg/` | Remove WASM references (keep files, just remove manifest refs) |
