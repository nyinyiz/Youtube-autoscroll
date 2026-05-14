const assert = require('assert');

const {
    buildSettings,
    isShortsPath,
} = require('../extension/content-state.js');

assert.strictEqual(isShortsPath('/shorts/abc123'), true, 'shorts watch paths are active');
assert.strictEqual(isShortsPath('/shorts/abc123?feature=share'), true, 'shorts paths with query strings are active');
assert.strictEqual(isShortsPath('/watch?v=abc123'), false, 'regular watch pages are ignored');
assert.strictEqual(isShortsPath('/'), false, 'youtube home is ignored');

assert.deepStrictEqual(
    buildSettings({ active: true, delay: 1.5, threshold: 0.8 }),
    { active: true, delay: 1.5, threshold: 0.8 },
    'stored settings are preserved',
);

assert.deepStrictEqual(
    buildSettings({}),
    { active: false, delay: 0, threshold: 0.5 },
    'missing settings use defaults',
);

console.log('content-state tests passed');
