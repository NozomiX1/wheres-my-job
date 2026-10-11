'use strict';
// deploy/update.sh：用本地的“远端仓库＋克隆”验证 git pull 与按改动文件决定是否重启。
const test = require('node:test'), a = require('node:assert/strict'), fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const { execFileSync, execFile } = require('node:child_process');

const repo = path.join(__dirname, '..');
const git = (cwd, ...args) => execFileSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', ...args], { cwd, encoding: 'utf8' });
const run = (root, env = {}) => new Promise(resolve => execFile('sh', [path.join(repo, 'deploy', 'update.sh')], { env: { ...process.env, ANDE_ROOT: root, ...env }, encoding: 'utf8' }, (error, stdout, stderr) => resolve({ code: error ? error.code : 0, out: stdout + stderr })));

function setup(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ande-update-')); t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const seed = path.join(dir, 'seed'), origin = path.join(dir, 'origin.git'), work = path.join(dir, 'work'), deploy = path.join(dir, 'deploy');
  fs.mkdirSync(seed); git(seed, 'init', '-q', '-b', 'main'); for (const f of ['server/index.js', 'index.html', 'README.md']) { fs.mkdirSync(path.dirname(path.join(seed, f)), { recursive: true }); fs.writeFileSync(path.join(seed, f), 'v1\n'); }
  git(seed, 'add', '-A'); git(seed, 'commit', '-qm', 'init'); git(dir, 'clone', '-q', '--bare', seed, origin); git(dir, 'clone', '-q', origin, deploy); git(dir, 'clone', '-q', origin, work);
  const push = (file, content) => { fs.mkdirSync(path.dirname(path.join(work, file)), { recursive: true }); fs.writeFileSync(path.join(work, file), content); git(work, 'add', '-A'); git(work, 'commit', '-qm', 'change ' + file); git(work, 'push', '-q', 'origin', 'main'); };
  return { dir, deploy, push, marker: path.join(dir, 'restarted'), env: { ANDE_RESTART_CMD: 'touch "' + path.join(dir, 'restarted') + '"' } };
}

test('update.sh: up to date is a no-op; front-end/docs changes pull without restart; server/crawler changes pull and restart', async t => {
  const s = setup(t);
  let r = await run(s.deploy, s.env); a.equal(r.code, 0); a.match(r.out, /已是最新/); a.ok(!fs.existsSync(s.marker));
  s.push('index.html', 'v2\n'); s.push('README.md', 'v2\n'); r = await run(s.deploy, s.env); a.equal(r.code, 0, r.out); a.match(r.out, /不需要重启/);
  a.equal(fs.readFileSync(path.join(s.deploy, 'index.html'), 'utf8'), 'v2\n'); a.ok(!fs.existsSync(s.marker), 'front-end only → no restart');
  s.push('server/index.js', 'v2\n'); r = await run(s.deploy, s.env); a.equal(r.code, 0, r.out); a.match(r.out, /重启服务/); a.ok(fs.existsSync(s.marker), 'server change → restart');
  fs.rmSync(s.marker); s.push('crawler/lib/x.js', 'v1\n'); r = await run(s.deploy, s.env); a.ok(fs.existsSync(s.marker), 'crawler change → restart (the server loads crawler/publish and its libs)');
  fs.rmSync(s.marker); s.push('server/search.js', 'v1\n'); r = await run(s.deploy, {}); a.equal(r.code, 0); a.match(r.out, /需要重启服务才生效/); a.ok(!fs.existsSync(s.marker), 'without ANDE_RESTART_CMD it only says so');
});

test('update.sh: refuses (and changes nothing) when the checkout has diverged from the remote', async t => {
  const s = setup(t);
  fs.writeFileSync(path.join(s.deploy, 'README.md'), 'local edit\n'); git(s.deploy, 'add', '-A'); git(s.deploy, 'commit', '-qm', 'local commit');
  s.push('server/index.js', 'v2\n');
  const r = await run(s.deploy, s.env); a.equal(r.code, 1); a.match(r.out, /没有更新/); a.ok(!fs.existsSync(s.marker));
  a.equal(fs.readFileSync(path.join(s.deploy, 'server', 'index.js'), 'utf8'), 'v1\n');
});
