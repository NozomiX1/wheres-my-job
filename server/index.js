'use strict';
// 安得搜索服务（原型）：把已发布数据读进内存，复用 assets/rank.js 打分排序，只返回一页结果。
// 同时提供 index.html、assets/ 与 data/catalog.js；分片文件不对外提供。无第三方依赖。
// 用法：PORT=8000 node server/index.js   （数据目录默认 ../data，可用 ANDE_DATA_FILE 指定 catalog.js）
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const { readPublished } = require('../crawler/publish');
const vm = require('node:vm');
const createRank = require('../assets/rank.js');
const { createIndex } = require('./search');

const ROOT = path.join(__dirname, '..');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };
const LIMITS = { body: 65536, words: 300, wordLength: 100, selected: 1000, page: 100, offset: 200000, requests: 120, windowMs: 10000 };
const RECRUITMENT = new Set(['all', 'social', 'campus', 'internship', 'talent']);

class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }

// 读取已发布数据并预先转好小写文本（每次查询不再重复转换）。
function load(dataFile) {
  const started = Date.now(), data = readPublished(dataFile), rank = createRank(data), byId = new Map();
  for (const job of data.jobs) {
    Object.defineProperty(job, '__lc', { value: [job.title || '', job.duty || job.description || '', job.requirements || ''].map(text => text.toLowerCase()), enumerable: false });
    Object.defineProperty(job, '__date', { value: rank.reliableDate(job), enumerable: false });
    Object.defineProperty(job, '__unit', { value: rank.unitName(job), enumerable: false });
    byId.set(job.id, job);
  }
  const updated = data.sources.map(s => s.lastSuccess).filter(Boolean).sort().at(-1) ?? null; // 各来源最近成功时间里最新的
  return { rank, index: createIndex(data.jobs, rank), jobs: data.jobs, byId, sources: data.sources.length, dataUpdatedAt: updated, loadedAt: new Date().toISOString(), loadMs: Date.now() - started, mtime: fs.statSync(dataFile).mtimeMs };
}

function parseQuery(body) {
  const list = (value, name) => {
    if (value === undefined) return [];
    if (!Array.isArray(value) || value.length > LIMITS.words || value.some(w => typeof w !== 'string' || !w.trim() || w.length > LIMITS.wordLength)) throw new HttpError(400, name + ' 无效');
    return value;
  };
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400, '请求无效');
  const selected = body.selected ?? [], recruitment = body.recruitment ?? 'all', offset = body.offset ?? 0, limit = body.limit ?? 50;
  if (!Array.isArray(selected) || selected.length > LIMITS.selected || selected.some(n => typeof n !== 'string')) throw new HttpError(400, 'selected 无效');
  if (!RECRUITMENT.has(recruitment)) throw new HttpError(400, 'recruitment 无效');
  if (!Number.isInteger(offset) || offset < 0 || offset > LIMITS.offset || !Number.isInteger(limit) || limit < 1 || limit > LIMITS.page) throw new HttpError(400, '分页参数无效');
  return { words: list(body.words, 'words'), lowered: list(body.lowered, 'lowered'), selected: new Set(selected), recruitment, offset, limit };
}

function search(state, body) {
  const q = parseQuery(body), { rank } = state, result = state.index.query(q);
  const items = result.rows.map(r => {
    const j = r.job;
    return { id: j.id, sourceKey: j.sourceKey, company: j.company, title: j.title, category: j.category, city: j.city, channels: j.channels, employment: j.employment, talentPlan: j.talentPlan,
      date: j.date, dateKind: j.dateKind, sourceStatus: j.sourceStatus, jdComplete: j.jdComplete, url: j.url, value: r.value, matched: r.matched, downranked: r.downranked,
      matchedText: r.matched.map(w => rank.hitText(j, w)), downrankedText: r.downranked.map(w => rank.hitText(j, w)) };
  });
  return { total: result.total, matched: result.matched, penalized: result.penalized, offset: q.offset, items };
}

// 示例词表（页面「填入示例」用）是最常见的查询，启动和重载后先把它们的命中缓存算好。
function exampleTerms() {
  const sandbox = {}; vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'assets', 'example-words.js'), 'utf8'), sandbox);
  return [...(sandbox.ANDE_EXAMPLES?.keywords || []), ...(sandbox.ANDE_EXAMPLES?.downrank || [])];
}

function createApp({ dataFile = process.env.ANDE_DATA_FILE || path.join(ROOT, 'data', 'catalog.js'), log = () => {}, reloadMs = 30000, warm = true } = {}) {
  if (!fs.existsSync(dataFile)) throw new Error('找不到数据文件 ' + dataFile + '。请先采集生成数据（node crawler/update.js <来源key>，见 README），再启动服务。');
  let state = load(dataFile);
  const warmUp = () => { if (warm) { const started = Date.now(), current = state; current.index.warm(exampleTerms()).then(() => log('warmed', current.index.size(), 'terms in', Date.now() - started, 'ms')).catch(error => log('warm failed:', error.message)); } };
  warmUp();
  const files = new Map(), hits = new Map();
  const reload = () => {
    try { if (fs.statSync(dataFile).mtimeMs !== state.mtime) { state = load(dataFile); log('reloaded', state.jobs.length, 'jobs in', state.loadMs, 'ms'); warmUp(); } }
    catch (error) { log('reload failed, keeping previous data:', error.message); }
  };
  const timer = reloadMs ? setInterval(reload, reloadMs) : null;
  timer?.unref();

  function limited(ip) {
    const now = Date.now(), entry = hits.get(ip);
    if (!entry || now - entry.start > LIMITS.windowMs) { hits.set(ip, { start: now, count: 1 }); if (hits.size > 5000) for (const [k, v] of hits) if (now - v.start > LIMITS.windowMs) hits.delete(k); return false; }
    return ++entry.count > LIMITS.requests;
  }
  function send(req, res, status, type, payload) {
    const buffer = Buffer.isBuffer(payload) ? payload : Buffer.from(payload);
    const headers = { 'Content-Type': type, 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' };
    if (buffer.length > 1024 && /\bgzip\b/.test(req.headers['accept-encoding'] || '')) { headers['Content-Encoding'] = 'gzip'; headers.Vary = 'Accept-Encoding'; res.writeHead(status, headers); return res.end(zlib.gzipSync(buffer)); }
    res.writeHead(status, headers); res.end(buffer);
  }
  const json = (req, res, status, value) => send(req, res, status, MIME['.json'], JSON.stringify(value));
  function readBody(req) {
    return new Promise((resolve, reject) => {
      let size = 0, tooLarge = false; const chunks = [];
      req.on('data', chunk => { size += chunk.length; if (size > LIMITS.body) { if (!tooLarge) reject(new HttpError(413, '请求过大')); tooLarge = true; } else chunks.push(chunk); });
      req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || 'null')); } catch { reject(new HttpError(400, 'JSON 无效')); } });
      req.on('error', reject);
    });
  }
  function serveStatic(req, res, pathname) {
    const rel = pathname === '/' ? 'index.html' : decodeURIComponent(pathname).replace(/^\/+/, '');
    // 只提供首页、assets/ 与目录 catalog.js；分片（data/parts）不对外。
    const allowed = rel === 'index.html' || rel === 'data/catalog.js' || /^assets\/[^/]+$/.test(rel);
    const file = path.join(ROOT, rel);
    if (!allowed || !file.startsWith(ROOT + path.sep)) throw new HttpError(404, '未找到');
    if (rel === 'data/catalog.js') return send(req, res, 200, MIME['.js'], fs.readFileSync(dataFile)); // 目录取自实际使用的数据文件（可由 ANDE_DATA_FILE 指定）
    if (!fs.existsSync(file)) throw new HttpError(404, '未找到');
    return send(req, res, 200, MIME[path.extname(file)] || 'application/octet-stream', fs.readFileSync(file));
  }

  const server = http.createServer(async (req, res) => {
    const started = Date.now();
    try {
      const url = new URL(req.url, 'http://localhost'), ip = req.socket.remoteAddress;
      if (url.pathname.startsWith('/api/')) {
        if (limited(ip)) throw new HttpError(429, '请求过于频繁，请稍后再试');
        if (req.method === 'POST' && url.pathname === '/api/search') {
          const result = search(state, await readBody(req));
          log('search', Date.now() - started + 'ms', 'total', result.total, 'page', result.items.length); // 不记录搜索词
          return json(req, res, 200, result);
        }
        if (req.method === 'GET' && url.pathname === '/api/health') { const m = process.memoryUsage(); let lastRun = null; try { lastRun = JSON.parse(fs.readFileSync(path.join(ROOT, 'crawler', 'out', 'logs', 'last-run.json'), 'utf8')); } catch {}
          return json(req, res, 200, { jobs: state.jobs.length, sources: state.sources, dataUpdatedAt: state.dataUpdatedAt, lastRun, loadedAt: state.loadedAt, loadMs: state.loadMs, rssMB: Math.round(m.rss / 1048576), heapMB: Math.round(m.heapUsed / 1048576) }); }
        const m = req.method === 'GET' && /^\/api\/job\/(.+)$/.exec(url.pathname);
        if (m) { const job = state.byId.get(decodeURIComponent(m[1])); if (!job) throw new HttpError(404, '岗位不存在'); return json(req, res, 200, job); }
        throw new HttpError(404, '未找到');
      }
      if (req.method !== 'GET') throw new HttpError(405, '不支持');
      return serveStatic(req, res, url.pathname);
    } catch (error) {
      const status = error.status || 500;
      if (status === 413) res.setHeader('Connection', 'close'); // 先回 413 再关连接
      if (status === 500) log('error', error.message);
      json(req, res, status, { error: status === 500 ? '服务器错误' : error.message });
    }
  });
  return { server, reload, state: () => state };
}

module.exports = { createApp, parseQuery, search, load, LIMITS };
if (require.main === module) {
  // 生产由采集结束后重启服务来加载新数据（ANDE_RELOAD_MS=0 关闭热加载，避免新旧数据同时在内存里）。
  let app;
  try { app = createApp({ log: (...args) => console.log(new Date().toISOString(), ...args), reloadMs: Number(process.env.ANDE_RELOAD_MS ?? 30000) }); }
  catch (error) { console.error(error.message); process.exit(1); }
  const port = Number(process.env.PORT) || 8000, host = process.env.HOST || '0.0.0.0';
  app.server.listen(port, host, () => console.log(new Date().toISOString(), `listening on ${host}:${port}; ${app.state().jobs.length} jobs loaded in ${app.state().loadMs}ms`));
  for (const signal of ['SIGTERM', 'SIGINT']) process.once(signal, () => app.server.close(() => process.exit(0)));
}
