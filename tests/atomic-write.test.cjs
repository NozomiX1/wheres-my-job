'use strict';
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const { atomicWrite } = require('../crawler/publish');

test('atomic-write failure leaves original data intact and no temp file', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ande-atomic-')); t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'data.js'); fs.writeFileSync(file, 'original');
  const original = fs.renameSync; fs.renameSync = () => { throw new Error('fixture rename failure'); };
  try { assert.throws(() => atomicWrite(file, 'replacement'), /fixture rename failure/); } finally { fs.renameSync = original; }
  assert.equal(fs.readFileSync(file, 'utf8'), 'original');
  assert.deepEqual(fs.readdirSync(dir), ['data.js']);
});
