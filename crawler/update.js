// Single entrypoint: registry -> crawl children (serial per host, parallel across hosts) -> one publish. No scoring/HTML/LLM.
// Usage: node crawler/update.js [key ...] (no arguments selects every registry source).
'use strict';
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { loadSites, publish } = require('./publish');

// 同一官网（或同一招聘供应商）的来源串行；开 Chrome 的来源共用一组，同时只跑一个（内存）。
// shortcut: 取主机名最后两段当供应商域，遇 .com.cn 之类会分得过粗（只会更保守地串行），需要时再细分。
const CHROME = site => site.ats === 'feishu' || /^(kuaishou|baichuan)-/.test(site.adapter || '');
function groupOf(site) {
  if (CHROME(site)) return 'chrome';
  try { return new URL(site.api || site.url).hostname.split('.').slice(-2).join('.'); } catch { return site.key; }
}

// 子进程输出按行加 [key] 前缀，并行时才分得清。
function spawnPrefixed(command, args, { onLine = () => {} } = {}) {
  return new Promise(resolve => {
    const tag = '[' + args[1] + '] ';
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    for (const [stream, out] of [[child.stdout, process.stdout], [child.stderr, process.stderr]]) {
      let rest = '';
      stream.setEncoding('utf8');
      stream.on('data', chunk => { const lines = (rest + chunk).split('\n'); rest = lines.pop(); for (const line of lines) { out.write(tag + line + '\n'); onLine(tag + line); } });
      stream.on('end', () => { if (rest) { out.write(tag + rest + '\n'); onLine(tag + rest); } });
    }
    child.on('error', error => resolve({ status: null, error }));
    child.on('close', (status, signal) => resolve({ status, signal }));
  });
}

// 每次运行一个带时间戳的日志文件（含全部子进程输出），另有 runs.jsonl 每个来源一行摘要，排查先看这里。
function openLog(dir) {
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'update-' + new Date().toISOString().replace(/[:.]/g, '-') + '.log');
  return { file, line: text => fs.appendFileSync(file, new Date().toISOString() + ' ' + text + '\n'), run: entry => fs.appendFileSync(path.join(dir, 'runs.jsonl'), JSON.stringify(entry) + '\n') };
}

async function runUpdate(keys = [], { sites = loadSites(), runner = spawnPrefixed, publisher = publish, outDir, dataFile, log = () => {}, concurrency = 4, logDir, full = false } = {}) {
  const file = logDir ? openLog(logDir) : null;
  const say = text => { log(text); file?.line(text); };
  say('update start: ' + keys.join(' ') + (keys.length ? '' : '(all)'));
  const selected = [...new Set(keys.length ? keys.flatMap(key => key.split(',').filter(Boolean)) : sites.map(site => site.key))];
  for (const key of selected) if (!sites.some(site => site.key === key)) throw new Error('Unknown source key: ' + key);
  const groups = new Map();
  for (const key of selected) {
    const group = groupOf(sites.find(site => site.key === key));
    groups.set(group, [...(groups.get(group) || []), key]);
  }
  const queue = [...groups.values()], attempts = [];
  const worker = async () => {
    for (let group; (group = queue.shift());) for (const key of group) {
      say('crawl ' + key);
      const startedAt = new Date();
      try {
        const child = await runner(process.execPath, [path.join(__dirname, 'crawl.js'), key, ...(full ? ['--full'] : [])], { onLine: text => file?.line(text) });
        const code = child && !child.error && !child.signal && child.status === 0 ? 0 : 1;
        attempts.push({ key, code });
        file?.run({ key, startedAt: startedAt.toISOString(), seconds: Math.round((Date.now() - startedAt) / 1000), exit: code, signal: child?.signal ?? null, error: child?.error?.message ?? null });
        if (code) say(key + ': crawl failed/unverified; keeping source baseline');
      } catch (error) {
        attempts.push({ key, code: 1 });
        file?.run({ key, startedAt: startedAt.toISOString(), seconds: Math.round((Date.now() - startedAt) / 1000), exit: 1, error: error.message });
        say(key + ': ' + error.message);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, queue.length) }, worker));
  // Even after a partial failure, publish the verified sources and preserve the others.
  let publication;
  try { publication = publisher({ sites, keys: selected, failedKeys: attempts.filter(attempt => attempt.code).map(attempt => attempt.key), outDir, dataFile }); }
  catch (error) { publication = { code: 1, written: false, updated: [], errors: [error.message] }; }
  const code = attempts.some(attempt => attempt.code) || publication.code ? 1 : 0;
  say('update done: ok=' + attempts.filter(a => !a.code).length + ' failed=' + attempts.filter(a => a.code).map(a => a.key).join(',') + ' published=' + (publication.updated || []).length + (publication.errors?.length ? ' publish-errors=' + publication.errors.join(' | ') : ''));
  return { code, attempts, publication, logFile: file?.file };
}

module.exports = { runUpdate, groupOf };
if (require.main === module) {
  runUpdate(process.argv.slice(2).filter(arg => arg !== '--full'), { full: process.argv.includes('--full'), log: console.log, logDir: path.join(__dirname, 'out', 'logs') }).then(result => {
    console.log(result.publication.written ? 'Published sources: ' + result.publication.updated.join(', ') : 'No verified updates; published data unchanged');
    for (const error of result.publication.errors || []) console.error(error);
    process.exitCode = result.code;
  }).catch(error => {
    console.error('ERR ' + error.message);
    process.exitCode = 1;
  });
}
