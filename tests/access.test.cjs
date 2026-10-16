'use strict';
const test = require('node:test'), a = require('node:assert/strict'), fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const { execFileSync } = require('node:child_process');
const { createAccessLog } = require('../server/access');
const { createApp } = require('../server/index');
const { summarize } = require('../deploy/access-stats');

const tmp = t => { const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ande-access-')); t.after(() => fs.rmSync(dir, { recursive: true, force: true })); return dir; };
const fixture = path.join(__dirname, 'fixtures', 'data', 'catalog.js');

test('access log: records time, event, ip, valid browser id and bot flag; bad ids are dropped; file is owner-only', t => {
  const file = path.join(tmp(t), 'access.log'), log = createAccessLog(file, { now: () => Date.parse('2026-10-16T08:00:00Z') });
  log.record('search', { headers: { 'x-visitor-id': 'abcd1234-ef56', 'user-agent': 'Mozilla/5.0' } }, '1.2.3.4');
  log.record('page', { headers: { 'x-visitor-id': 'bad id!', 'user-agent': 'Googlebot/2.1' } }, '5.6.7.8');
  a.deepEqual(fs.readFileSync(file, 'utf8').trim().split('\n').map(l => l.split('\t')), [
    ['2026-10-16T08:00:00.000Z', 'search', '1.2.3.4', 'abcd1234-ef56', '0'], ['2026-10-16T08:00:00.000Z', 'page', '5.6.7.8', '', '1']]);
  a.equal(fs.statSync(file).mode & 0o777, 0o600);
});

test('access log: prune drops lines older than the retention days and keeps the rest', t => {
  const file = path.join(tmp(t), 'access.log'), now = Date.parse('2026-10-16T00:00:00Z');
  fs.writeFileSync(file, ['2026-09-01T00:00:00.000Z\tpage\t1.1.1.1\t\t0', '2026-10-10T00:00:00.000Z\tsearch\t2.2.2.2\tabcd1234\t0'].join('\n') + '\n');
  createAccessLog(file, { days: 30, now: () => now }).prune();
  a.deepEqual(fs.readFileSync(file, 'utf8').trim().split('\n').map(l => l.split('\t')[2]), ['2.2.2.2']);
  createAccessLog('', {}).record('page', { headers: {} }, 'x'); // disabled: nothing happens
});

test('server writes page/search/job events with the forwarded client IP and never the search words', async t => {
  const file = path.join(tmp(t), 'access.log');
  const app = createApp({ dataFile: fixture, reloadMs: 0, warm: false, accessLog: file });
  await new Promise(r => app.server.listen(0, '127.0.0.1', r)); t.after(() => app.server.close());
  const base = 'http://127.0.0.1:' + app.server.address().port, headers = { 'x-forwarded-for': '203.0.113.9', 'x-visitor-id': 'visitor-00001' };
  await fetch(base + '/', { headers });
  const found = await (await fetch(base + '/api/search', { method: 'POST', headers, body: JSON.stringify({ words: ['极其独特的搜索词'], limit: 1 }) })).json();
  await fetch(base + '/api/job/' + encodeURIComponent(found.items[0].id), { headers });
  await fetch(base + '/assets/app.js', { headers }); // 静态资源不计
  const text = fs.readFileSync(file, 'utf8'), rows = text.trim().split('\n').map(l => l.split('\t'));
  a.deepEqual(rows.map(r => r.slice(1)), [['page', '203.0.113.9', 'visitor-00001', '0'], ['search', '203.0.113.9', 'visitor-00001', '0'], ['job', '203.0.113.9', 'visitor-00001', '0']]);
  a.ok(!text.includes('极其独特的搜索词'));
});

test('stats: counts per Beijing day, skips bots and excluded IPs, counts unique IPs and browsers', () => {
  const log = [
    '2026-10-15T20:00:00.000Z\tpage\t1.1.1.1\t\t0', // 北京时间 10-16 04:00
    '2026-10-16T01:00:00.000Z\tsearch\t1.1.1.1\tbrowser-aaaa\t0',
    '2026-10-16T02:00:00.000Z\tsearch\t2.2.2.2\tbrowser-bbbb\t0',
    '2026-10-16T02:30:00.000Z\tsearch\t2.2.2.2\tbrowser-bbbb\t0',
    '2026-10-16T03:00:00.000Z\tpage\t9.9.9.9\t\t1', // 机器人
    '2026-10-16T04:00:00.000Z\tjob\t3.3.3.3\tbrowser-cccc\t0' // 被排除
  ].join('\n');
  const { rows, ips } = summarize(log, { days: 7, exclude: ['3.3.3.3'], now: Date.parse('2026-10-17T00:00:00Z') });
  a.deepEqual(rows, [{ day: '2026-10-16', page: 1, search: 3, job: 0, ips: 2, visitors: 2 }]);
  a.deepEqual(ips, [['1.1.1.1', 2], ['2.2.2.2', 2]]);
  const file = path.join(os.tmpdir(), 'ande-stats-' + process.pid + '.log'); fs.writeFileSync(file, log);
  try { a.match(execFileSync('node', [path.join(__dirname, '..', 'deploy', 'access-stats.js'), file, '--days', '3650', '--ips'], { encoding: 'utf8' }), /日期[\s\S]*独立IP[\s\S]*1\.1\.1\.1/); } finally { fs.rmSync(file, { force: true }); }
});

test('stats script: when every IP is loopback it reports browsers only and says why', t => {
  const file = path.join(tmp(t), 'access.log'), day = new Date().toISOString();
  fs.writeFileSync(file, [`${day}\tpage\t127.0.0.1\t\t0`, `${day}\tsearch\t127.0.0.1\tbrowser-aaaa\t0`, `${day}\tsearch\t127.0.0.1\tbrowser-bbbb\t0`].join('\n') + '\n');
  const out = execFileSync('node', [path.join(__dirname, '..', 'deploy', 'access-stats.js'), file, '--days', '3', '--ips'], { encoding: 'utf8' });
  a.match(out, /独立浏览器/); a.ok(!/独立IP/.test(out)); a.match(out, /127\.0\.0\.1/); a.match(out, /\s2\s*\n/);
});
