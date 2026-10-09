// Offline contract checks only: VM + fake DOM, never a browser or network.
// Run: node --test tests/data-loader.test.cjs
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createHash } = require('node:crypto');

let loader;
try {
  loader = fs.readFileSync(path.join(__dirname, '..', 'assets', 'data-loader.js'), 'utf8');
} catch (error) {
  if (error.code === 'ENOENT') {
    error.message = 'Missing assets/data-loader.js: implement ANDE_LOAD_PARTS before running these tests.';
  }
  throw error;
}

function part(label, overrides = {}) {
  const id = createHash('sha256').update(label).digest('hex');
  return { id, file: `parts/${id}.js`, sourceKey: 'a', company: '甲', count: 1, ...overrides };
}

function job(id, overrides = {}) {
  return {
    id, sourceKey: 'a', company: '甲', title: '软件工程师', city: '北京', category: '研发',
    channels: ['social'], employment: 'full-time', talentPlan: false,
    date: null, dateKind: null, sourceStatus: 'open', url: `https://official.example/jobs/${id}`,
    duty: '职责原文\n第二行', requirements: '要求原文', description: '完整岗位正文', jdComplete: true,
    ...overrides
  };
}

const turn = () => new Promise(resolve => setImmediate(resolve));

function fixture() {
  const requests = [], attached = new Set(), timers = new Map(), data = { jobs: [] };
  let nextTimer = 0;
  const head = {
    appendChild(script) {
      script.parentNode = this;
      attached.add(script);
      requests.push(script);
      return script;
    },
    removeChild(script) {
      assert.ok(attached.delete(script), 'Only an attached script can be removed');
      script.parentNode = null;
      return script;
    }
  };
  const document = {
    baseURI: 'https://ande.example/project/index.html', head,
    createElement(tag) {
      assert.equal(tag.toLowerCase(), 'script');
      return {
        src: '', onload: null, onerror: null, parentNode: null,
        setAttribute(name, value) { this[name] = String(value); },
        remove() { if (this.parentNode) this.parentNode.removeChild(this); }
      };
    }
  };
  const context = vm.createContext({
    ANDE_DATA: data, document, URL, location: new URL(document.baseURI),
    setTimeout(callback, delay) {
      const id = ++nextTimer;
      timers.set(id, { callback, delay });
      return id;
    },
    clearTimeout(id) { timers.delete(id); }
  });
  context.window = context;
  vm.runInContext(loader, context, { filename: 'assets/data-loader.js', timeout: 1000 });
  assert.equal(typeof context.ANDE_LOAD_PARTS, 'function', 'Loader must expose ANDE_LOAD_PARTS');

  function start(parts, onProgress) {
    const promise = context.ANDE_LOAD_PARTS(parts, onProgress);
    assert.ok(promise && typeof promise.then === 'function', 'ANDE_LOAD_PARTS must return a Promise');
    // Attach both handlers immediately, including for synchronous validation rejections.
    const pending = { settled: false };
    pending.result = Promise.resolve(promise).then(
      () => { pending.settled = true; return { ok: true }; },
      error => { pending.settled = true; return { ok: false, error }; }
    );
    return pending;
  }

  function complete(script, descriptor, rows) {
    // Execute just the same global assignment a real shard would execute.
    vm.runInContext(`globalThis.ANDE_CHUNKS = globalThis.ANDE_CHUNKS || {};
      globalThis.ANDE_CHUNKS[${JSON.stringify(descriptor.id)}] = ${JSON.stringify(rows)};`, context);
    const originals = context.ANDE_CHUNKS[descriptor.id];
    assert.equal(typeof script.onload, 'function');
    script.onload();
    return originals;
  }

  function clean() {
    assert.equal(attached.size, 0, 'Settled scripts must be removed');
    assert.equal(timers.size, 0, 'Settled scripts must clear their timeout');
  }

  return { context, data, requests, attached, timers, document, start, complete, clean };
}

async function succeeds(pending) {
  const result = await pending.result;
  assert.equal(result.ok, true, result.error && result.error.stack);
}

async function fails(pending, label) {
  const result = await pending.result;
  assert.equal(result.ok, false, label);
  assert.ok(result.error, 'A failed load must report an error');
}

// The test timeout bounds a broken Promise; shard timeouts use the fake clock below.
test('loads in parallel, keeps complete original jobs, reports progress and resolves only after all parts', { timeout: 2000 }, async () => {
  const f = fixture(), first = part('first'), second = part('second'), progress = [];
  const jobs = f.data.jobs;
  const pending = f.start([first, second], (done, total) => progress.push([done, total]));
  await turn();
  assert.equal(f.requests.length, 2, 'All parts are requested at once');
  assert.equal(pending.settled, false);
  assert.equal(new URL(f.requests[0].src, f.document.baseURI).href,
    new URL(`data/${first.file}`, f.document.baseURI).href);
  const originalFirst = f.complete(f.requests[0], first, [job('a:1')])[0];
  await turn();
  assert.equal(f.requests[0].parentNode, null);
  assert.equal(pending.settled, false, 'First success must not resolve the whole load');
  assert.strictEqual(jobs[0], originalFirst, 'Do not reconstruct or truncate the job');
  assert.ok(progress.some(([done, total]) => done === 1 && total === 2));
  assert.equal(new URL(f.requests[1].src, f.document.baseURI).href,
    new URL(`data/${second.file}`, f.document.baseURI).href);
  const originalSecond = f.complete(f.requests[1], second, [job('a:2')])[0];
  await succeeds(pending);
  assert.strictEqual(f.context.ANDE_DATA, f.data);
  assert.strictEqual(f.data.jobs, jobs, 'Append to the existing jobs array');
  assert.strictEqual(jobs[1], originalSecond);
  assert.deepEqual(Array.from(jobs, row => row.id), ['a:1', 'a:2']);
  assert.equal(jobs[0].title, jobs[1].title, 'Same title with different IDs is legal');
  // An optional initial (0, total) callback is allowed; successes are counted once.
  assert.deepEqual(progress.filter(([done]) => done > 0), [[1, 2], [2, 2]]);
  f.clean();
});

test('concurrent callers share one request and successful parts stay cached without double append', { timeout: 2000 }, async () => {
  const f = fixture(), descriptor = part('shared');
  const first = f.start([descriptor]), concurrent = f.start([descriptor]);
  await turn();
  assert.equal(f.requests.length, 1);
  assert.equal(first.settled, false);
  assert.equal(concurrent.settled, false);
  const original = f.complete(f.requests[0], descriptor, [job('a:shared')])[0];
  await Promise.all([succeeds(first), succeeds(concurrent)]);
  assert.equal(f.data.jobs.length, 1);
  assert.strictEqual(f.data.jobs[0], original);
  await succeeds(f.start([descriptor]));
  await succeeds(f.start([]));
  assert.equal(f.requests.length, 1, 'Cached and empty loads must not request scripts');
  assert.equal(f.data.jobs.length, 1);
  f.clean();
});

test('script errors keep earlier successes, do not retry automatically and allow explicit retry', { timeout: 2000 }, async () => {
  const f = fixture(), first = part('keep'), second = part('retry');
  const pending = f.start([first, second]);
  await turn();
  const original = f.complete(f.requests[0], first, [job('a:keep')])[0];
  await turn();
  assert.equal(f.requests.length, 2);
  assert.equal(typeof f.requests[1].onerror, 'function');
  f.requests[1].onerror(new Error('offline script error'));
  await fails(pending);
  await turn();
  assert.equal(f.requests.length, 2, 'Failure must not cause an automatic retry');
  assert.equal(f.data.jobs.length, 1);
  assert.strictEqual(f.data.jobs[0], original);
  f.clean();

  const retry = f.start([first, second]);
  await turn();
  assert.equal(f.requests.length, 3, 'Only the failed part needs a new request');
  f.complete(f.requests[2], second, [job('a:retried')]);
  await succeeds(retry);
  assert.deepEqual(Array.from(f.data.jobs, row => row.id), ['a:keep', 'a:retried']);
  f.clean();
});

test('a script times out at 30 seconds, is removed and can be explicitly retried', { timeout: 2000 }, async () => {
  const f = fixture(), descriptor = part('timeout');
  const pending = f.start([descriptor]);
  await turn();
  assert.equal(f.requests.length, 1);
  assert.equal(f.timers.size, 1);
  const [id, timer] = Array.from(f.timers)[0];
  assert.equal(timer.delay, 30000);
  f.timers.delete(id); // A real one-shot timer is consumed before its callback runs.
  timer.callback();
  await fails(pending);
  await turn();
  assert.equal(f.data.jobs.length, 0);
  assert.equal(f.requests.length, 1, 'Timeout must not retry automatically');
  f.clean();
  f.complete(f.requests[0], descriptor, [job('a:late-after-timeout')]);
  assert.equal(f.data.jobs.length, 0, 'A late onload after timeout must not append or poison the retry');

  const retry = f.start([descriptor]);
  await turn();
  assert.equal(f.requests.length, 2);
  f.complete(f.requests[1], descriptor, [job('a:after-timeout')]);
  await succeeds(retry);
  assert.equal(f.data.jobs.length, 1);
  f.clean();
});

test('bad count, source, company, IDs or chunk payload reject atomically; duplicate IDs across parts also reject', { timeout: 2000 }, async () => {
  const cases = [
    { label: 'count mismatch', count: 2, rows: [job('a:valid')] },
    { label: 'source mismatch', count: 2, rows: [job('a:valid'), job('a:wrong', { sourceKey: 'b' })] },
    { label: 'company mismatch', count: 2, rows: [job('a:valid'), job('a:wrong', { company: '乙' })] },
    { label: 'missing ID', count: 2, rows: [job('a:valid'), job(undefined)] },
    { label: 'empty ID', count: 2, rows: [job('a:valid'), job('')] },
    { label: 'duplicate IDs within a part', count: 2, rows: [job('a:dup'), job('a:dup')] },
    { label: 'non-array payload', count: 1, rows: { jobs: [job('a:valid')] } },
    { label: 'script loaded without registering its chunk', count: 1, missing: true }
  ];
  for (const scenario of cases) {
    const f = fixture(), descriptor = part(scenario.label, { count: scenario.count });
    const pending = f.start([descriptor]);
    await turn();
    assert.equal(f.requests.length, 1, scenario.label);
    if (scenario.missing) f.requests[0].onload();
    else f.complete(f.requests[0], descriptor, scenario.rows);
    await fails(pending, scenario.label);
    await turn();
    assert.equal(f.data.jobs.length, 0, `${scenario.label}: never append a valid prefix`);
    assert.equal(f.requests.length, 1, `${scenario.label}: no automatic retry`);
    f.clean();

    const retry = f.start([descriptor]);
    await turn();
    assert.equal(f.requests.length, 2, `${scenario.label}: failure is not a cache hit`);
    f.complete(f.requests[1], descriptor,
      Array.from({ length: descriptor.count }, (_, index) => job(`a:retry-${index}`)));
    await succeeds(retry);
    assert.equal(f.data.jobs.length, descriptor.count);
    f.clean();
  }

  const f = fixture(), first = part('duplicate-first'), second = part('duplicate-second', { count: 2 });
  const initial = f.start([first]);
  await turn();
  const original = f.complete(f.requests[0], first, [job('a:existing')])[0];
  await succeeds(initial);
  const duplicate = f.start([second]);
  await turn();
  f.complete(f.requests[1], second, [job('a:new'), job('a:existing')]);
  await fails(duplicate, 'Cross-part duplicate IDs must reject the whole new part');
  assert.equal(f.data.jobs.length, 1);
  assert.strictEqual(f.data.jobs[0], original);
  f.clean();
});

test('external URLs, traversal and nonmatching lowercase hash paths reject before creating scripts, even for cached IDs', { timeout: 2000 }, async () => {
  const descriptor = part('safe'), other = part('different');
  const invalid = [
    { ...descriptor, file: `https://outside.example/${descriptor.file}` },
    { ...descriptor, file: `//outside.example/${descriptor.file}` },
    { ...descriptor, file: `../${descriptor.file}` },
    { ...descriptor, file: `parts/../${descriptor.file}` },
    { ...descriptor, file: other.file },
    { ...descriptor, file: `${descriptor.file}?extra=1` },
    { ...descriptor, file: `${descriptor.file}#extra` },
    { ...descriptor, id: descriptor.id.toUpperCase(), file: `parts/${descriptor.id.toUpperCase()}.js` },
    { ...descriptor, id: descriptor.id.slice(1), file: `parts/${descriptor.id.slice(1)}.js` }
  ];
  const f = fixture();
  for (const candidate of invalid) {
    await fails(f.start([candidate]), `Invalid descriptor: ${candidate.file}`);
    assert.equal(f.requests.length, 0, 'Reject unsafe descriptors before appending any script');
    assert.equal(f.data.jobs.length, 0);
    f.clean();
  }

  const valid = f.start([descriptor]);
  await turn();
  const original = f.complete(f.requests[0], descriptor, [job('a:safe')])[0];
  await succeeds(valid);
  for (const candidate of invalid) {
    await fails(f.start([candidate]), `Cache must not bypass validation: ${candidate.file}`);
    assert.equal(f.requests.length, 1);
    assert.equal(f.data.jobs.length, 1);
    assert.strictEqual(f.data.jobs[0], original);
    f.clean();
  }
});

test('at most 12 parts are in flight; a freed slot starts the next one; a failure stops new requests', { timeout: 2000 }, async () => {
  const f = fixture(), parts = Array.from({ length: 30 }, (_, i) => part('p' + i, { sourceKey: 'a' }));
  const pending = f.start(parts);
  await turn();
  assert.equal(f.requests.length, 12);
  f.complete(f.requests[0], parts[0], [job('a:0')]);
  await turn();
  assert.equal(f.requests.length, 13, 'A finished part frees a slot for the next one');
  f.requests[1].onerror(new Error('offline'));
  await fails(pending);
  await turn();
  f.complete(f.requests[2], parts[2], [job('a:2')]);
  await turn();
  assert.equal(f.requests.length, 13, 'No new request after a failure');
  assert.equal(f.data.jobs.length, 2, 'In-flight parts that finish are still cached');
});
