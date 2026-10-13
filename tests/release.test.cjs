'use strict';
// Release 数据分发：打包 → 本地 HTTP 假 Release → deploy/pull.sh 上线；校验、新鲜度检查。
const test = require('node:test'), a = require('node:assert/strict'), fs = require('node:fs'), os = require('node:os'), path = require('node:path'), http = require('node:http');
const { execFile } = require('node:child_process');
const { pack } = require('../crawler/pack-release');
const { stale, retryable } = require('../crawler/check-fresh');
const { readPublished } = require('../crawler/publish');

const fixture = path.join(__dirname, 'fixtures', 'data'), repo = path.join(__dirname, '..');
const tmp = t => { const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ande-release-')); t.after(() => fs.rmSync(dir, { recursive: true, force: true })); return dir; };
const run = (file, args, env = {}) => new Promise(resolve => execFile(file, args, { env: { ...process.env, ...env }, encoding: 'utf8' }, (error, stdout, stderr) => resolve({ code: error ? error.code : 0, out: stdout + stderr })));
async function serve(t, dir) { // 把 dir 里的文件当作 Release 附件提供；文件不存在回 404
  const server = http.createServer((req, res) => { const f = path.join(dir, path.basename(req.url)); if (!fs.existsSync(f)) { res.writeHead(404); return res.end(); } res.writeHead(200); res.end(fs.readFileSync(f)); });
  await new Promise(r => server.listen(0, '127.0.0.1', r)); t.after(() => server.close()); return 'http://127.0.0.1:' + server.address().port;
}

test('pack: archive + meta with matching sha256, job and source counts', t => {
  const out = tmp(t), meta = pack(out, fixture);
  a.equal(meta.jobs, readPublished(path.join(fixture, 'catalog.js')).jobs.length); a.ok(meta.sources > 0 && meta.updatedAt);
  a.equal(meta.sha256, require('node:crypto').createHash('sha256').update(fs.readFileSync(path.join(out, 'data.tar.gz'))).digest('hex'));
  a.deepEqual(JSON.parse(fs.readFileSync(path.join(out, 'data-meta.json'), 'utf8')), meta);
  a.throws(() => pack(out, tmp(t)), /没有已发布数据/);
});

test('stale: sources never or long ago updated are listed', () => {
  const now = Date.parse('2026-10-11T00:00:00Z'), h = n => new Date(now - n * 3600000).toISOString();
  a.deepEqual(stale([{ key: 'a', lastSuccess: h(1) }, { key: 'b', lastSuccess: h(80) }, { key: 'c' }], 72, now), ['b', 'c']);
});

test('retryable: stale and not refused; fresh or refused sources are skipped', () => {
  const now = Date.parse('2026-01-02T00:00:00Z'), h = n => new Date(now - n * 3600000).toISOString();
  const sources = [{ key: 'ok', lastSuccess: h(1), message: '' }, { key: 'net', lastSuccess: h(30), message: 'Adapter failed' }, { key: 'ban', lastSuccess: h(30), message: '官网拒绝；Adapter failed' }, { key: 'new', message: '' }];
  a.deepEqual(retryable(sources, 12, now), ['net', 'new']);
});

test('validate-data refuses a dataset that is too small against the current one', async () => {
  a.equal((await run(process.execPath, [path.join(repo, 'deploy', 'validate-data.js'), fixture, fixture])).code, 0);
  const bad = await run(process.execPath, [path.join(repo, 'deploy', 'validate-data.js'), fixture, fixture, '--min-ratio=1.5']);
  a.equal(bad.code, 1); a.match(bad.out, /少于现有/);
  a.equal((await run(process.execPath, [path.join(repo, 'deploy', 'validate-data.js'), tmp({ after() {} })])).code, 1);
});

test('pull.sh: installs new data, is a no-op when unchanged, rotates old data, and refuses a corrupted download', async t => {
  const release = tmp(t), root = tmp(t); pack(release, fixture);
  const base = await serve(t, release), env = { ANDE_ROOT: root, ANDE_BASE_URL: base, ANDE_RESTART_CMD: 'touch "$ANDE_ROOT/restarted"', TMPDIR: tmp(t) }, pull = () => run('sh', [path.join(repo, 'deploy', 'pull.sh')], env);
  let r = await pull(); a.equal(r.code, 0, r.out); a.match(r.out, /已上线新数据/); a.ok(fs.existsSync(path.join(root, 'data', 'catalog.js'))); a.ok(fs.existsSync(path.join(root, 'restarted')));
  a.equal(readPublished(path.join(root, 'data', 'catalog.js')).jobs.length, JSON.parse(fs.readFileSync(path.join(release, 'data-meta.json'), 'utf8')).jobs);
  fs.rmSync(path.join(root, 'restarted')); r = await pull(); a.equal(r.code, 0); a.ok(!fs.existsSync(path.join(root, 'restarted')), 'unchanged meta → no restart');
  // 新一版（内容有变化，sha 不同）→ 上线并把旧版留作 data.prev.1
  const next = tmp(t), copy = path.join(next, 'data'); fs.cpSync(fixture, copy, { recursive: true }); fs.writeFileSync(path.join(copy, 'marker.txt'), 'v2'); pack(release, copy);
  r = await pull(); a.equal(r.code, 0, r.out); a.ok(fs.existsSync(path.join(root, 'data', 'marker.txt'))); a.ok(fs.existsSync(path.join(root, 'data.prev.1', 'catalog.js'))); a.ok(!fs.existsSync(path.join(root, 'data.prev.1', 'marker.txt')));
  // 下载内容被改动（sha 不符）→ 拒绝，现有数据不动
  const meta = JSON.parse(fs.readFileSync(path.join(release, 'data-meta.json'), 'utf8')); meta.sha256 = 'f'.repeat(64); fs.writeFileSync(path.join(release, 'data-meta.json'), JSON.stringify(meta));
  fs.rmSync(path.join(root, 'restarted'), { force: true }); r = await pull(); a.equal(r.code, 1); a.match(r.out, /sha256 不符/); a.ok(fs.existsSync(path.join(root, 'data', 'marker.txt'))); a.ok(!fs.existsSync(path.join(root, 'restarted')));
  // 还没发布（取不到 meta）→ 跳过，不算失败
  fs.rmSync(path.join(release, 'data-meta.json')); r = await pull(); a.equal(r.code, 0); a.match(r.out, /跳过/);
  a.deepEqual(fs.readdirSync(root).filter(n => n.startsWith('.pull.')), [], 'no temp dirs left behind');
});
