'use strict';
// deploy/crawl-local.sh：用假的 gh 和假的采集命令，验证“只采指定来源、基线必须取到、和 Actions 不同时写、变了才上传”。
const test = require('node:test'), a = require('node:assert/strict'), fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const { execFile } = require('node:child_process');
const { pack } = require('../crawler/pack-release');

const repo = path.join(__dirname, '..'), fixture = path.join(__dirname, 'fixtures', 'data');
const tmp = t => { const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ande-local-test-')); t.after(() => fs.rmSync(dir, { recursive: true, force: true })); return dir; };
const run = (args, env) => new Promise(resolve => execFile('sh', [path.join(repo, 'deploy', 'crawl-local.sh'), ...args], { env: { ...process.env, ...env }, encoding: 'utf8' }, (error, stdout, stderr) => resolve({ code: error ? error.code : 0, out: stdout + stderr })));

// 假的 gh：run list 返回 $FAKE_RUNNING；release download 拷出事先打好的基线；release upload 把文件收集到 $FAKE_UPLOADS。
function setup(t, { running = '0', baseline = true, change = true } = {}) {
  const dir = tmp(t), bin = path.join(dir, 'bin'), uploads = path.join(dir, 'uploads'), release = path.join(dir, 'release');
  fs.mkdirSync(bin); fs.mkdirSync(uploads); pack(release, fixture);
  fs.writeFileSync(path.join(bin, 'gh'), `#!/bin/sh
echo "$@" >> "$FAKE_LOG"
case "$1 $2" in
  "run list") echo "$FAKE_RUNNING" ;;
  "release download") [ "$FAKE_BASELINE" = 1 ] || { echo "release not found" >&2; exit 1; }; while [ $# -gt 0 ]; do [ "$1" = "-D" ] && dest="$2"; shift; done; cp "$FAKE_RELEASE/data.tar.gz" "$dest/data.tar.gz" ;;
  "release upload") cp "$4" "$FAKE_UPLOADS/$(basename "$4")" ;;
esac
`); fs.chmodSync(path.join(bin, 'gh'), 0o755);
  fs.writeFileSync(path.join(dir, 'stub.sh'), `#!/bin/sh\necho "$@" > "$FAKE_ARGS"\n${change ? 'echo " " >> data/catalog.js' : ':'}\n`);
  return { dir, uploads, env: { PATH: bin + path.delimiter + process.env.PATH, FAKE_LOG: path.join(dir, 'gh.log'), FAKE_ARGS: path.join(dir, 'args.txt'), FAKE_RUNNING: running, FAKE_BASELINE: baseline ? '1' : '0', FAKE_RELEASE: release, FAKE_UPLOADS: uploads, ANDE_UPDATE_CMD: 'sh ' + path.join(dir, 'stub.sh'), ANDE_YES: '1', TMPDIR: tmp(t) } };
}

test('crawl-local: needs explicit source keys; refuses while Actions is crawling; refuses without a baseline', async t => {
  const s = setup(t);
  let r = await run([], s.env); a.equal(r.code, 2); a.match(r.out, /必须明确给出来源 key/);
  const busy = setup(t, { running: '1' }); r = await run(['bilibili'], busy.env); a.equal(r.code, 1); a.match(r.out, /先等它结束/); a.deepEqual(fs.readdirSync(busy.uploads), []);
  const none = setup(t, { baseline: false }); r = await run(['bilibili'], none.env); a.notEqual(r.code, 0); a.deepEqual(fs.readdirSync(none.uploads), [], 'no upload without a baseline');
});

test('crawl-local: crawls only the given keys on top of the baseline, then uploads package before meta; unchanged data uploads nothing', async t => {
  const s = setup(t);
  const r = await run(['bilibili', 'tencent'], s.env); a.equal(r.code, 0, r.out); a.match(r.out, /采集前后岗位数/); a.match(r.out, /已上传/);
  a.equal(fs.readFileSync(path.join(s.dir, 'args.txt'), 'utf8').trim(), 'bilibili tencent', 'only the requested keys are passed on');
  a.deepEqual(fs.readdirSync(s.uploads).sort(), ['data-meta.json', 'data.tar.gz']);
  const log = fs.readFileSync(path.join(s.dir, 'gh.log'), 'utf8').split('\n'), tarAt = log.findIndex(l => l.includes('data.tar.gz') && l.includes('upload')), metaAt = log.findIndex(l => l.includes('data-meta.json') && l.includes('upload'));
  a.ok(tarAt >= 0 && metaAt > tarAt, 'package first, meta second'); a.match(log[tarAt], /--clobber/);
  const meta = JSON.parse(fs.readFileSync(path.join(s.uploads, 'data-meta.json'), 'utf8')); a.ok(meta.jobs > 0 && meta.sha256);
  const same = setup(t, { change: false }); const r2 = await run(['bilibili'], same.env); a.equal(r2.code, 0); a.match(r2.out, /没有变化/); a.deepEqual(fs.readdirSync(same.uploads), []);
  const dry = setup(t); const r3 = await run(['bilibili'], { ...dry.env, ANDE_DRY_RUN: '1' }); a.equal(r3.code, 0); a.deepEqual(fs.readdirSync(dry.uploads), []);
  const noConfirm = setup(t); const r4 = await run(['bilibili'], { ...noConfirm.env, ANDE_YES: '' }); a.equal(r4.code, 1); a.match(r4.out, /ANDE_YES=1/); a.deepEqual(fs.readdirSync(noConfirm.uploads), []);
});
