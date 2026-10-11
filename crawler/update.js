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

// 失败输出里出现这些，就是官网拒绝（403/412/429 等 4xx、验证页）：当天不补采，留给次日定时任务。
// 宁可多判成拒绝（少补采），也不把拒绝当成临时故障去重试。
const REFUSAL = /\b(?:HTTP|status)[ :=]*4(?!08\b)\d\d\b|refus|blocked|requires verification|captcha|verify you are human|验证页|安全验证|滑块验证|请完成验证|访问异常|拒绝/i;
const RETRY_DELAYS = [5 * 60000, 15 * 60000]; // 整轮结束后等 5 分钟补采一次；仍失败再等 15 分钟补最后一次
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

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
  return { file, line: text => fs.appendFileSync(file, new Date().toISOString() + ' ' + text + '\n'), run: entry => fs.appendFileSync(path.join(dir, 'runs.jsonl'), JSON.stringify(entry) + '\n'), last: entry => fs.writeFileSync(path.join(dir, 'last-run.json'), JSON.stringify(entry, null, 2) + '\n') };
}

async function runUpdate(keys = [], { sites = loadSites(), runner = spawnPrefixed, publisher = publish, outDir, dataFile, log = () => {}, concurrency = Number(process.env.ANDE_CONCURRENCY) || 4, logDir, full = false, retryDelays = [], sleep = wait } = {}) {
  const file = logDir ? openLog(logDir) : null;
  const say = text => { log(text); file?.line(text); };
  const startedAt = new Date().toISOString();
  say('update start: ' + keys.join(' ') + (keys.length ? '' : '(all)') + (full ? ' --full' : ''));
  const selected = [...new Set(keys.length ? keys.flatMap(key => key.split(',').filter(Boolean)) : sites.map(site => site.key))];
  for (const key of selected) if (!sites.some(site => site.key === key)) throw new Error('Unknown source key: ' + key);
  const results = new Map(); // key → { code, refused }，以最后一次尝试为准
  // 同一官网的来源串行、不同官网并行；pass>0 为补采，只跑传入的来源。
  const crawlAll = async (todo, pass) => {
    const groups = new Map();
    for (const key of todo) {
      const group = groupOf(sites.find(site => site.key === key));
      groups.set(group, [...(groups.get(group) || []), key]);
    }
    const queue = [...groups.values()];
    const worker = async () => {
      for (let group; (group = queue.shift());) for (const key of group) {
        say('crawl ' + key + (pass ? '（补采 ' + pass + '）' : ''));
        const startedAt = new Date(), lines = [];
        let code = 1, signal = null, error = null;
        try {
          const child = await runner(process.execPath, [path.join(__dirname, 'crawl.js'), key, ...(full ? ['--full'] : [])], { onLine: text => { file?.line(text); lines.push(text); } });
          code = child && !child.error && !child.signal && child.status === 0 ? 0 : 1; signal = child?.signal ?? null; error = child?.error?.message ?? null;
        } catch (e) { error = e.message; lines.push(e.message); say(key + ': ' + e.message); }
        const refused = code === 1 && lines.some(line => REFUSAL.test(line));
        results.set(key, { code, refused });
        file?.run({ key, startedAt: startedAt.toISOString(), seconds: Math.round((Date.now() - startedAt) / 1000), exit: code, signal, error, attempt: pass + 1, ...(refused ? { refused: true } : {}) });
        if (code) say(key + ': crawl failed/unverified; keeping source baseline' + (refused ? '（官网拒绝，当天不补采）' : ''));
      }
    };
    await Promise.all(Array.from({ length: Math.min(concurrency, queue.length) }, worker));
  };
  await crawlAll(selected, 0);
  // 补采：只补失败且不是官网拒绝的来源；一个来源最多尝试 1+retryDelays.length 次。
  const failedFirst = selected.filter(key => results.get(key).code);
  for (let pass = 1; pass <= retryDelays.length; pass++) {
    const todo = selected.filter(key => results.get(key).code && !results.get(key).refused);
    if (!todo.length) break;
    say('retry pass ' + pass + ' in ' + Math.round(retryDelays[pass - 1] / 1000) + 's: ' + todo.join(' '));
    await sleep(retryDelays[pass - 1]);
    await crawlAll(todo, pass);
  }
  const attempts = selected.map(key => ({ key, code: results.get(key).code }));
  const recovered = failedFirst.filter(key => !results.get(key).code), refusedKeys = selected.filter(key => results.get(key).refused);
  if (recovered.length) say('recovered by retry: ' + recovered.join(','));
  // Even after a partial failure, publish the verified sources and preserve the others.
  let publication;
  try { publication = publisher({ sites, keys: selected, failedKeys: attempts.filter(attempt => attempt.code).map(attempt => attempt.key), outDir, dataFile }); }
  catch (error) { publication = { code: 1, written: false, updated: [], errors: [error.message] }; }
  const code = attempts.some(attempt => attempt.code) || publication.code ? 1 : 0;
  say('update done: ok=' + attempts.filter(a => !a.code).length + ' failed=' + attempts.filter(a => a.code).map(a => a.key).join(',') + ' published=' + (publication.updated || []).length + (publication.errors?.length ? ' publish-errors=' + publication.errors.join(' | ') : ''));
  // 给 /api/health 看的最近一次结果：不用登录服务器就能知道数据新不新、哪些来源失败。
  file?.last({ startedAt, finishedAt: new Date().toISOString(), full, sources: attempts.length, failed: attempts.filter(a => a.code).map(a => a.key), refused: refusedKeys, recovered, published: (publication.updated || []).length, publishErrors: publication.errors || [], log: path.basename(file.file) });
  return { code, attempts, publication, logFile: file?.file };
}

module.exports = { runUpdate, groupOf, REFUSAL, RETRY_DELAYS };
if (require.main === module) {
  const flags = ['--full', '--no-retry'];
  runUpdate(process.argv.slice(2).filter(arg => !flags.includes(arg)), { full: process.argv.includes('--full'), retryDelays: process.argv.includes('--no-retry') ? [] : RETRY_DELAYS, log: console.log, logDir: path.join(__dirname, 'out', 'logs') }).then(result => {
    console.log(result.publication.written ? 'Published sources: ' + result.publication.updated.join(', ') : 'No verified updates; published data unchanged');
    for (const error of result.publication.errors || []) console.error(error);
    process.exitCode = result.code;
  }).catch(error => {
    console.error('ERR ' + error.message);
    process.exitCode = 1;
  });
}
