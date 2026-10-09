'use strict';
const test = require('node:test'), a = require('node:assert/strict'), fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const { withRetry, installFetchRetry } = require('../crawler/lib/retry');
const portals = require('../crawler/lib/portals');
const { runCrawl } = require('../crawler/crawl');
const { loadSites } = require('../crawler/publish');
const nosleep = async () => {};

test('retry: transient errors and 5xx/408 are retried at most twice; refusals and other 4xx are returned at once', async () => {
  let calls = 0; const waits = [], notes = [];
  const flaky = await withRetry(async () => { calls++; if (calls < 3) throw new Error('fetch failed'); return { status: 200 }; }, { sleepImpl: async ms => waits.push(ms), onRetry: (n, why) => notes.push([n, why]) });
  a.equal(flaky.status, 200); a.equal(calls, 3); a.deepEqual(waits, [1000, 3000]); a.deepEqual(notes, [[1, 'fetch failed'], [2, 'fetch failed']]);
  calls = 0; await a.rejects(withRetry(async () => { calls++; throw new Error('boom'); }, { sleepImpl: nosleep }), /boom/); a.equal(calls, 3); // 共 3 次尝试
  for (const status of [500, 503, 408]) { calls = 0; const r = await withRetry(async () => { calls++; return { status }; }, { sleepImpl: nosleep }); a.equal(calls, 3, 'HTTP ' + status); a.equal(r.status, status); }
  for (const status of [403, 412, 429, 404, 302, 200]) { calls = 0; const r = await withRetry(async () => { calls++; return { status }; }, { sleepImpl: nosleep }); a.equal(calls, 1, 'HTTP ' + status + ' is never retried'); a.equal(r.status, status); }
  calls = 0; await a.rejects(withRetry(async () => { calls++; throw new Error('Chrome interrupted'); }, { sleepImpl: nosleep, retryable: e => !/interrupted/.test(e.message) }), /interrupted/); a.equal(calls, 1);
});

test('retry preload wraps fetch: fresh timeout signal on retry, one log line per retry, bodies reused', async t => {
  const original = globalThis.fetch; t.after(() => { globalThis.fetch = original; });
  const seen = [], lines = [];
  globalThis.fetch = async (url, init) => { seen.push(init); if (seen.length < 3) throw new TypeError('fetch failed'); return { status: 200, url }; };
  installFetchRetry({ log: line => lines.push(line), delays: [0, 0] });
  const first = AbortSignal.timeout(15000), response = await globalThis.fetch('https://example.test/api?x=1', { method: 'POST', body: '{"a":1}', signal: first });
  a.equal(response.status, 200); a.equal(seen.length, 3);
  a.equal(seen[0].signal, first); a.notEqual(seen[1].signal, first); a.ok(seen[1].signal instanceof AbortSignal); a.equal(seen[2].body, '{"a":1}');
  a.equal(lines.length, 2); a.match(lines[0], /^\[retry\] example\.test fetch failed（第1次重试）$/);
  seen.length = 0; globalThis.fetch = async () => { seen.push(1); return { status: 429 }; }; installFetchRetry({ log: l => lines.push(l), delays: [0, 0] });
  a.equal((await globalThis.fetch('https://example.test/')).status, 429); a.equal(seen.length, 1);
});

test('listStopped: only list-stage stops and caps block publishing; detail-stage stops do not', () => {
  const site = { api: 'https://x.example/api/list' };
  const env = (stopped, issues = []) => ({ verification: { stopped, issues } });
  a.equal(portals.listStopped(env(null), site), false);
  a.equal(portals.listStopped(env({ stage: 'page', error: 'x' }), site), true);
  a.equal(portals.listStopped(env({ stage: 'detail', error: 'x' }), site), false);
  a.equal(portals.listStopped(env({ request: { url: 'https://x.example/api/list?page=3' }, error: 'x' }), site), true);
  a.equal(portals.listStopped(env({ request: { url: 'https://x.example/api/detail/9' }, error: 'x' }), site), false);
  a.equal(portals.listStopped(env({ request: { pageIndex: 3 }, error: 'x' }), site), true); // 看不出地址：按列表出错处理
  a.equal(portals.listStopped(env(null, ['请求停止：HTTP 500']), site), true);
  a.equal(portals.listStopped(env(null, ['详情请求停止：HTTP 403']), site), false);
  a.equal(portals.listStopped(env(null, ['达到分页安全上限，覆盖待补']), site), true);
  a.equal(portals.listStopped({ jobs: [], issues: ['列表中 2 条缺ID/标题，未收录'] }, site), false);
});

test('crawl records problems: retries and issues on a successful run, and every failure', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ande-record-')); t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const site = loadSites().find(s => s.key === 'sensetime');
  const post = id => ({ id, title: '岗位' + id, description: '职责', requirement: '要求' });
  const good = { total: 2, jobs: [{ rawPost: post('1') }, { rawPost: post('2') }], issues: ['官方total 3；实际唯一岗位 2'], verification: { key: site.key, pages: 1, issues: ['官方total 3；实际唯一岗位 2'] } };
  let seenEnv;
  const ok = runCrawl(site, { outDir: dir, now: () => '2026-10-09T00:00:00.000Z', runner: (_, args, options) => { seenEnv = options.env; fs.writeFileSync(args.at(-1), JSON.stringify(good)); return { status: 0, stderr: '[retry] hr-jobs.sensetime.com HTTP 503（第1次重试）\nother noise\n' }; } });
  a.equal(ok.code, 0); a.equal(ok.status, 'ready');
  a.match(seenEnv.NODE_OPTIONS, /--require=.*retry-preload\.js/);
  a.deepEqual(ok.issues, ['官方total 3；实际唯一岗位 2', '重试 1 次（hr-jobs.sensetime.com HTTP 503（第1次重试））']);
  a.match(ok.message, /已更新：2 个岗位.*官方total 3.*重试 1 次/);
  const failed = runCrawl(site, { outDir: dir, now: () => '2026-10-09T01:00:00.000Z', runner: () => ({ status: 1, stderr: '[retry] a 1\n[retry] a 2\n' }) });
  a.equal(failed.code, 1); a.equal(failed.status, 'failed');
  const zero = runCrawl(site, { outDir: dir, now: () => '2026-10-09T02:00:00.000Z', runner: (_, args) => { fs.writeFileSync(args.at(-1), JSON.stringify({ total: 0, jobs: [], issues: [] })); return { status: 0 }; } });
  a.equal(zero.code, 1);
  const lines = fs.readFileSync(path.join(dir, 'crawl-issues.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
  a.deepEqual(lines.map(l => [l.at, l.outcome, l.retries]), [['2026-10-09T00:00:00.000Z', 'ready-with-issues', 1], ['2026-10-09T01:00:00.000Z', 'failed', 2], ['2026-10-09T02:00:00.000Z', 'unverified', 0]]);
  a.deepEqual(lines[0].issues.length, 2); a.match(lines[1].error, /Adapter failed/); a.ok(lines.every(l => l.key === 'sensetime'));
  // 干净的成功不写记录
  runCrawl(site, { outDir: dir, now: () => '2026-10-09T03:00:00.000Z', runner: (_, args) => { fs.writeFileSync(args.at(-1), JSON.stringify({ total: 2, jobs: good.jobs, issues: [], verification: { key: site.key, pages: 1, issues: [] } })); return { status: 0 }; } });
  a.equal(fs.readFileSync(path.join(dir, 'crawl-issues.jsonl'), 'utf8').trim().split('\n').length, 3);
});
