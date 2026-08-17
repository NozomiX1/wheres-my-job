// 字节跳动校招：关键词搜索 + CDP 抓取页面自身签名的 /api/v1/search/job/posts 响应。
// 全量分页（空 subject）岗位数过大且 acrawler 逐页签名过慢会超时，故用「每关键词一次导航 + 抓响应」。
const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');

const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const KEYWORDS = ['大模型', '智能体', 'Agent', 'AI应用', '大模型应用', '多模态', '生成式', 'LLM', 'NLP', 'AIGC', '机器学习', '算法', '语音', '图像生成'];
const BASE = 'https://jobs.bytedance.com/campus/position?keywords=';

const getJSON = u => new Promise((res, rej) => { const q = http.get(u, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => { try { res(JSON.parse(d)); } catch (e) { rej(e); } }); }); q.on('error', rej); q.setTimeout(3000, () => q.destroy(new Error('t'))); });
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function fetchAll() {
  const PORT = 9600 + Math.floor(Math.random() * 300);
  const PROFILE = path.join(os.tmpdir(), `jobs-bd-${Date.now()}`);
  const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage', '--ignore-certificate-errors', '--allow-running-insecure-content', `--remote-debugging-port=${PORT}`, '--remote-allow-origins=*', `--user-data-dir=${PROFILE}`, 'about:blank'], { stdio: 'ignore' });

  let target = null;
  for (let i = 0; i < 50; i++) { try { const l = await getJSON(`http://127.0.0.1:${PORT}/json/list`); target = l.find(t => t.type === 'page'); if (target) break; } catch (e) {} await sleep(500); }
  if (!target) { chrome.kill(); throw new Error('NO_TARGET'); }

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  let id = 0, opener;
  const opened = new Promise(r => { opener = r; });
  ws.onopen = () => opener();
  const call = (m, p = {}) => new Promise(res => { const mid = ++id; const h = ev => { const x = JSON.parse(ev.data); if (x.id === mid) { ws.removeEventListener('message', h); res(x.result); } }; ws.addEventListener('message', h); ws.send(JSON.stringify({ id: mid, method: m, params: p })); });

  const captured = [];
  const pending = new Map(); // requestId -> {url, status, body}
  ws.addEventListener('message', ev => {
    const m = JSON.parse(ev.data);
    if (m.method === 'Network.responseReceived') {
      const r = m.params.response;
      if (r.url.includes('/api/v1/search/job/posts')) pending.set(m.params.requestId, { url: r.url, status: r.status, body: null });
    } else if (m.method === 'Network.loadingFinished') {
      const rec = pending.get(m.params.requestId);
      if (rec && rec.body === null) {
        rec.body = null; // 标记避免重复
        call('Network.getResponseBody', { requestId: m.params.requestId }).then(rr => { if (rr && rr.body) rec.body = rr.body; rec.done = true; }).catch(() => { rec.done = true; });
      }
    }
  });

  await opened;
  await call('Network.enable'); await call('Page.enable');
  for (const kw of KEYWORDS) {
    await call('Page.navigate', { url: BASE + encodeURIComponent(kw) });
    await sleep(8000);
  }
  await sleep(2000);
  chrome.kill();

  const jobs = [];
  const seen = new Set();
  for (const rec of pending.values()) {
    if (!rec.body) continue;
    try {
      const j = JSON.parse(rec.body);
      const list = (j.data && j.data.job_post_list) || [];
      for (const p of list) {
        if (!p.id || seen.has(p.id)) continue;
        seen.add(p.id);
        jobs.push(p);
      }
    } catch (e) {}
  }

  return jobs.map(p => {
    const rt = p.recruit_type || {};
    const cityList = (p.city_list || []).map(c => (c && c.name) || '').filter(Boolean);
    return {
      title: p.title || '',
      dept: (p.job_subject && p.job_subject.name) || (p.job_category && p.job_category.name) || '-',
      city: cityList.join('/') || ((p.city_info && p.city_info.name) || '-'),
      date: p.publish_time ? new Date(Number(p.publish_time) + 8 * 3600 * 1000).toISOString().slice(0, 10) : '-',
      url: `https://jobs.bytedance.com/campus/position/${p.id}/detail`,
      desc: '',
      commitment: (rt.name || ''),
      recruitType: (rt.name || ''),
      recruitParent: (rt.parent && rt.parent.name) || '',
      id: String(p.id)
    };
  });
}

module.exports = { fetchAll };

if (require.main === module) {
  fetchAll().then(jobs => {
    fs.writeFileSync(path.join(__dirname, '..', '..', 'out', 'bytedance_raw.json'), JSON.stringify(jobs, null, 2), 'utf8');
    console.log('raw=' + jobs.length);
  }).catch(e => { console.error('ERR ' + e.message); process.exit(1); });
}
