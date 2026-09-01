// 飞书/字节 ATS 客户端：无头 Chrome 注入 acrawler 后签名，拉全量岗位。
// 适用：jobs.bytedance.com、*.jobs.feishu.cn（MiniMax/莉莉丝/叠纸）、hr-jobs.sensetime.com（商汤）等。
//   这些站的 /api/v1/search/job/posts 需要 _signature（byted acrawler），普通 Node fetch 会 405，必须在页面内签名。
// 用法：node feishu.js <url> <outPrefix> <aid> <websitePath> [subjectIdListCSV]
//   aid: 页面内 acrawler 的 appId（字节 1943、莉莉丝 1658、商汤/MiniMax 从页面 init 里查）。
//   websitePath: campus | edu（商汤用 edu）等。
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');

const URL_IN = process.argv[2];
const OUT = process.argv[3] || 'feishu_all';
const AID = parseInt(process.argv[4] || '1943', 10);
const WPATH = process.argv[5] || 'campus';
const SUBJECTS = process.argv[6] ? process.argv[6].split(',') : [];
const PLAIN = process.argv[7] === 'plain' || process.argv[7] === '1';

const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9600 + Math.floor(Math.random() * 300);
const PROFILE = path.join(os.tmpdir(), `jobs-crawler-feishu-${Date.now()}`);

function getJSON(url) {
  return new Promise((res, rej) => { const q = http.get(url, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => { try { res(JSON.parse(d)); } catch (e) { rej(e); } }); }); q.on('error', rej); q.setTimeout(3000, () => q.destroy(new Error('t'))); });
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage', '--ignore-certificate-errors', '--allow-running-insecure-content', `--remote-debugging-port=${PORT}`, '--remote-allow-origins=*', `--user-data-dir=${PROFILE}`, 'about:blank'], { stdio: 'ignore' });
  let target = null;
  for (let i = 0; i < 60; i++) { try { const l = await getJSON(`http://127.0.0.1:${PORT}/json/list`); target = l.find(t => t.type === 'page'); if (target) break; } catch (e) {} await sleep(500); }
  if (!target) { console.log('NO_TARGET'); chrome.kill(); process.exit(0); }

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  let id = 0, opener;
  const opened = new Promise(r => { opener = r; });
  ws.onopen = () => opener();
  const call = (method, params = {}) => new Promise(res => {
    const mid = ++id; const h = ev => { const m = JSON.parse(ev.data); if (m.id === mid) { ws.removeEventListener('message', h); res(m.result); } };
    ws.addEventListener('message', h); ws.send(JSON.stringify({ id: mid, method, params }));
  });

  await opened;
  await call('Page.enable'); await call('Runtime.enable');
  await call('Page.navigate', { url: URL_IN });
  await sleep(18000);

  const expr = `(async () => {
    const AID = ${AID}, WPath = ${JSON.stringify(WPATH)}, SUBJECTS = ${JSON.stringify(SUBJECTS)}, PLAIN = ${PLAIN};
    if (!PLAIN) {
      if (!window.byted_acrawler) {
        await new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://lf3-cdn-tos.bytescm.com/obj/rc-web-sdk/acrawler.js'; s.onload = res; s.onerror = () => rej(new Error('acrawler load fail')); document.head.appendChild(s); });
      }
      if (window.byted_acrawler && window.byted_acrawler.init) { try { window.byted_acrawler.init({ aid: AID, dfp: false, boe: false, intercept: false }); } catch (e) {} }
    }
    let token = window.csrfToken;
    if (!PLAIN && !token) { const r = await fetch('/api/v1/csrf/token', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ portal_entrance: 1 }) }); const j = await r.json(); token = j.data && j.data.token; }
    async function signed(path, body) {
      let sig = '';
      if (!PLAIN && window.byted_acrawler && window.byted_acrawler.sign) { sig = await window.byted_acrawler.sign({ url: location.origin + path, body: body ? JSON.stringify(body) : undefined }); }
      const url = path + (path.includes('?') ? '&' : '?') + (sig ? ('_signature=' + encodeURIComponent(sig)) : '');
      const hdr = { 'Content-Type': 'application/json' };
      if (!PLAIN) { hdr['x-csrf-token'] = token; hdr['X-Requested-With'] = 'XMLHttpRequest'; hdr['accept-language'] = 'zh-CN'; hdr['website-path'] = WPath; hdr['Portal-Channel'] = 'saas-career'; hdr['Portal-Platform'] = 'pc'; }
      const r = await fetch(url, { method: 'POST', headers: hdr, body: body ? JSON.stringify(body) : undefined });
      const txt = await r.text();
      try { return JSON.parse(txt); } catch (e) { return { __err: 'status ' + r.status, __body: txt.slice(0, 200) }; }
    }
    const all = [];
    let offset = 0, total = 0; const limit = 50;
    while (true) {
      const body = { keyword: '', limit, offset, job_category_id_list: [], tag_id_list: [], location_code_list: [], subject_id_list: SUBJECTS, recruitment_id_list: [], portal_type: 6, job_function_id_list: [], storefront_id_list: [], portal_entrance: 1 };
      const qs = 'keyword=&limit=' + limit + '&offset=' + offset + '&job_category_id_list=&tag_id_list=&location_code_list=&subject_id_list=' + SUBJECTS.join(',') + '&recruitment_id_list=&portal_type=6&job_function_id_list=&storefront_id_list=&portal_entrance=1';
      const res = await signed('/api/v1/search/job/posts?' + qs, body);
      if (res.__err) return { __err: res.__err, n: all.length, all };
      const d = res.data || {};
      const list = d.job_post_list || [];
      all.push(...list);
      total = d.count || total;
      offset += limit;
      if (list.length < limit) break;
      if (total && all.length >= total) break;
      await new Promise(r => setTimeout(r, 150));
    }
    // 打印首条原始岗位的字段名 + description 相关键，用于确认描述字段名
    const first = all[0] || {};
    console.log('RAWKEYS ' + Object.keys(first).join(','));
    console.log('DESCSAMPLE ' + JSON.stringify({ description: first.description, job_description: first.job_description, jobDescription: first.jobDescription, desc: first.desc, summary: first.summary }).slice(0, 400));
    return { total, n: all.length, all: all.map(x => ({ id: x.id, title: x.title, recruitType: x.recruit_type && x.recruit_type.name, recruitParent: x.recruit_type && x.recruit_type.parent && x.recruit_type.parent.name, cities: (x.city_list || []).map(c => c.name), category: x.job_category && x.job_category.name, jobFunction: x.job_function && x.job_function.name, publish: x.publish_time, subject: x.job_subject && x.job_subject.name, description: x.description || x.job_description || x.jobDescription || '' })) };
  })()`;
  const r = await call('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  const val = r && r.result && r.result.value;
  const s = typeof val === 'string' ? val : JSON.stringify(val);
  fs.writeFileSync(`${OUT}.json`, s, 'utf8');
  console.log('LEN ' + s.length + '\n' + s.slice(0, 1500));
  chrome.kill(); process.exit(0);
}
setTimeout(() => { console.log('GLOBAL_TIMEOUT'); process.exit(1); }, 600000);
main().catch(e => { console.log('ERR ' + e.message); process.exit(1); });
