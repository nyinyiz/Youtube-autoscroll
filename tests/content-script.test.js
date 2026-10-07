// Drives the real extension/content.js inside a fake Shorts page with a fake
// clock, so the storage wiring, loop tracking and click path are exercised
// end to end rather than only through the pure helpers.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function harness() {
    let now = 0;
    const clicks = [];

    // A real-enough timer queue: both setTimeout and setInterval, driven by the
    // fake clock, so this harness can run any version of the content script
    // rather than only one shaped the way we expect.
    let playedMs = 0;
    let seq = 0;
    const timers = new Map();
    const setTimer = (fn, ms, repeat) => {
        const id = ++seq;
        const delay = Number.isFinite(ms) && ms > 0 ? ms : 0;
        timers.set(id, { fn, due: now + delay, every: repeat ? delay : null });
        return id;
    };
    const fireDue = () => {
        for (const [id, t] of [...timers.entries()]) {
            if (t.due > now) continue;
            if (t.every === null) timers.delete(id);
            else t.due = now + Math.max(t.every, 1);
            t.fn();
        }
    };
    let store = {};
    let changeListener = null;

    const player = {
        duration: NaN, currentTime: 0, paused: false,
        navButton: { click: () => clicks.push(now) },
    };
    const loc = { pathname: '/shorts/aaaaaaaaaaa' };

    const listeners = [];
    const document = {
        addEventListener: (type, fn) => listeners.push({ type, fn }),
        removeEventListener: () => {},
        querySelector(sel) {
            if (sel === '#shorts-player video') return player.present === false ? null : player;
            if (sel === '#navigation-button-down button') return player.navButton;
            return null;
        },
    };

    const sandbox = {
        document,
        location: loc,
        setInterval: (fn, ms) => setTimer(fn, ms, true),
        clearInterval: (id) => { timers.delete(id); },
        setTimeout: (fn, ms) => setTimer(fn, ms, false),
        clearTimeout: (id) => { timers.delete(id); },
        Date: { now: () => now },
        chrome: {
            storage: {
                local: { get: (_keys, cb) => cb({ ...store }) },
                onChanged: { addListener: (fn) => { changeListener = fn; } },
            },
        },
    };
    sandbox.window = sandbox;
    vm.createContext(sandbox);

    for (const file of ['scroll-state.js', 'content.js']) {
        vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'extension', file), 'utf8'), sandbox, { filename: file });
    }

    return {
        clicks, player, loc,
        running: () => timers.size > 0,
        // Advance the fake clock, playing the video forward, ticking as the
        // extension's own interval would.
        run(seconds, { playing = true } = {}) {
            const steps = Math.round((seconds * 1000) / 50);
            for (let i = 0; i < steps; i++) {
                now += 50;
                if (playing && !player.paused && Number.isFinite(player.duration)) {
                    playedMs += 50;
                    player.currentTime = (playedMs % Math.round(player.duration * 1000)) / 1000;
                }
                fireDue();
            }
        },
        emit(type, target) {
            listeners.filter((l) => l.type === type).forEach((l) => l.fn({ target }));
        },
        change(partial) {
            const changes = {};
            for (const [k, v] of Object.entries(partial)) {
                changes[k] = { oldValue: store[k], newValue: v };
                store[k] = v;
            }
            changeListener(changes, 'local');
        },
        seed(values) { store = { ...values }; },
        seek(seconds) { playedMs = Math.round(seconds * 1000); player.currentTime = seconds; },
    };
}

// storage.local.get resolves against an empty store during load, so settings
// are driven in via a change event -- exactly what the popup does.
function boot(stored) {
    const h = harness();
    // content.js already read the empty store; drive it to the right state via
    // a change event, which is exactly what the popup does.
    h.change(stored);
    return h;
}

{
    const h = boot({ active: true, delay: 0, threshold: 0.5 });
    h.player.duration = 10;
    h.run(9.4);
    assert.strictEqual(h.clicks.length, 0, 'does not fire before the trigger point');
    h.run(0.4);
    assert.strictEqual(h.clicks.length, 1, 'fires once at duration - threshold');
}

// --- RC1: unchecking the toggle really stops it. ---------------------------
{
    const h = boot({ active: true, delay: 0, threshold: 0.5 });
    h.player.duration = 10;
    h.run(5);
    h.change({ active: false });
    assert.strictEqual(h.running(), false, 'poller stops when deactivated');
    h.run(10);
    assert.strictEqual(h.clicks.length, 0, 'a deactivated extension never scrolls');
}

// --- RC1: moving a slider must not corrupt the timing into NaN. ------------
{
    const h = boot({ active: true, delay: 0, threshold: 0.5 });
    h.player.duration = 10;
    h.change({ delay: 1.5 });        // the popup writes a change record here
    h.run(1);
    assert.strictEqual(h.clicks.length, 0, 'a slider change must not fire instantly');
    h.run(8.4);
    assert.strictEqual(h.clicks.length, 0, 'still holding for the 1.5s delay');
    // Trigger lands at 11.0s (9.5s + a 1.5s hold); allow for the poll interval.
    h.run(1.8);
    assert.strictEqual(h.clicks.length, 1, 'fires once the hold has elapsed, after the loop wraps');
}

// --- RC3: metadata arriving late still scrolls (no missed re-arm). ---------
{
    const h = boot({ active: true, delay: 0, threshold: 0.5 });
    h.run(3);                        // duration NaN the whole time
    assert.strictEqual(h.clicks.length, 0, 'nothing to do without metadata');
    h.player.duration = 10;          // metadata lands late, no event fired
    h.run(9.6);
    assert.strictEqual(h.clicks.length, 1, 'picks up a duration that appeared without an event');
}

// --- RC4: a paused short is never scrolled away. ---------------------------
{
    const h = boot({ active: true, delay: 0, threshold: 0.5 });
    h.player.duration = 10;
    h.run(2);
    // Scrub to the last second and pause -- e.g. to read text on screen. The
    // trigger point is already behind us, so only the paused check saves it.
    h.player.paused = true;
    h.seek(9.8);
    h.run(5, { playing: false });
    assert.strictEqual(h.clicks.length, 0, 'a short paused past the trigger point is never scrolled away');
    h.player.paused = false;
    h.run(0.5);
    assert.strictEqual(h.clicks.length, 1, 'resumes and fires once unpaused');
}

// --- RC5: a click that does not advance retries on a real cooldown. --------
{
    const h = boot({ active: true, delay: 0, threshold: 0.5 });
    h.player.duration = 10;
    h.run(9.6);
    assert.strictEqual(h.clicks.length, 1, 'first attempt');
    h.run(2.0);
    assert.strictEqual(h.clicks.length, 1, 'no click-spam inside the cooldown');
    h.run(0.8);                      // past RETRY_MS = 2500
    assert.strictEqual(h.clicks.length, 2, 'retries about 2.5s later, not a whole duration later');
    h.run(2.6);
    assert.strictEqual(h.clicks.length, 3, 'third attempt');
    h.run(30);
    assert.strictEqual(h.clicks.length, 3, 'gives up instead of clicking forever');
}

// --- Navigating to the next short clears the latch. ------------------------
{
    const h = boot({ active: true, delay: 0, threshold: 0.5 });
    h.player.duration = 10;
    h.run(9.6);
    assert.strictEqual(h.clicks.length, 1);
    h.loc.pathname = '/shorts/bbbbbbbbbbb';   // YouTube advanced the reel
    h.seek(0);
    h.run(9.6);
    assert.strictEqual(h.clicks.length, 2, 'the next short gets its own scroll');
}

// --- RC2: idles off-route, then works after SPA navigation into Shorts. ----
{
    const h = boot({ active: true, delay: 0, threshold: 0.5 });
    h.loc.pathname = '/feed/subscriptions';
    h.player.duration = 10;
    h.run(20);
    assert.strictEqual(h.clicks.length, 0, 'never clicks outside the Shorts route');
    h.loc.pathname = '/shorts/ccccccccccc';   // pushState, same document
    h.seek(0);
    h.run(9.6);
    assert.strictEqual(h.clicks.length, 1, 'works after in-app navigation into Shorts');
}

console.log('content-script tests passed');
