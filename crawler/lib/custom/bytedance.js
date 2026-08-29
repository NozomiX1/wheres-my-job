// 字节跳动校招：全量抓「校招研发」岗位（约 1210 条）。
// 分两阶段（都在无头 Chrome 页面内执行，页面自带 acrawler 签名）：
//   1) 列表：翻页拉全量 /api/v1/search/job/posts
//   2) desc：逐岗调详情 /api/v1/job/posts/<id>?portal_type=3
// 每阶段带进度打印与失败重试，避免单次 evaluate 无限挂起。
const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');

const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const CATEGORY = '6704215862603155720,6704215956018694411,6704215862557018372,6704215957146962184,6704215886108035339,6704215897130666254,6704219534724696331,6704216109274368264,6704215888985327886,6938376045242353957,6704215958816295181,6704215963966900491,6704216296701036811,6704217321877014787,6704216635923761412';
const PROJECT = '7649336829398468869';
const LIST_URL = `https://jobs.bytedance.com/campus/position?keywords=&category=${encodeURIComponent(CATEGORY)}&location=&project=${PROJECT}&type=&job_hot_flag=&current=1&limit=10&functionCategory=&tag=`;

const getJSON = u => new Promise((res, rej) => { const q = http.get(u, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => { try { res(JSON.parse(d)); } catch (e) { rej(e); } }); }); q.on('error', rej); q.setTimeout(3000, () => q.destroy(new Error('t'))); });
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function fetchAll() {
  const PORT = 9600 + Math.floor(Math.random() * 300);
  const PROFILE = path.join(os.tmpdir(), `jobs-bd-${Date.now()}`);
  const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage', '--ignore-certificate-errors', '--allow-running-insecure-content', `--remote-debugging-port=${PORT}`, '--remote-allow-origins=*', `--user-data-dir=${PROFILE}`, 'about:blank'], { stdio: 'ignore' });

  let target = null;
  for (let i = 0; i < 60; i++) { try { const l = await getJSON(`http://127.0.0.1:${PORT}/json/list`); target = l.find(t => t.type === 'page'); if (target) break; } catch (e) {} await sleep(500); }
  if (!target) { chrome.kill(); throw new Error('NO_TARGET'); }

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  let id = 0, opener;
  const opened = new Promise(r => { opener = r; });
  ws.onopen = () => opener();
  const call = (m, p = {}) => new Promise(res => { const mid = ++id; const h = ev => { const x = JSON.parse(ev.data); if (x.id === mid) { ws.removeEventListener('message', h); res(x.result); } }; ws.addEventListener('message', h); ws.send(JSON.stringify({ id: mid, method: m, params: p })); });

  await opened;
  await call('Page.enable'); await call('Runtime.enable');
  await call('Page.navigate', { url: LIST_URL });
  await sleep(15000);

  // 页面内公共代码：注入 acrawler、签名函数
  const BOOTSTRAP = `
    if (!window.byted_acrawler) {
      await new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://lf3-cdn-tos.bytescm.com/obj/rc-web-sdk/acrawler.js'; s.onload = res; s.onerror = () => rej(new Error('acrawler load fail')); document.head.appendChild(s); });
    }
    if (window.byted_acrawler && window.byted_acrawler.init) { try { window.byted_acrawler.init({ aid: 1943, dfp: false, boe: false, intercept: false }); } catch (e) {} }
    let token = window.csrfToken;
    if (!token) { const r = await fetch('/api/v1/csrf/token', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ portal_entrance: 1 }) }); const j = await r.json(); token = j.data && j.data.token; }
    async function signed(path, body) {
      let sig = '';
      if (window.byted_acrawler && window.byted_acrawler.sign) { sig = await window.byted_acrawler.sign({ url: location.origin + path, body: body ? JSON.stringify(body) : undefined }); }
      const url = path + (path.includes('?') ? '&' : '?') + (sig ? ('_signature=' + encodeURIComponent(sig)) : '');
      const hdr = { 'Content-Type': 'application/json', 'x-csrf-token': token, 'X-Requested-With': 'XMLHttpRequest', 'accept-language': 'zh-CN', 'website-path': 'campus', 'Portal-Channel': 'saas-career', 'Portal-Platform': 'pc' };
      const r = await fetch(url, { method: 'POST', headers: hdr, body: body ? JSON.stringify(body) : undefined });
      const txt = await r.text();
      try { return JSON.parse(txt); } catch (e) { return { __err: 'status ' + r.status }; }
    }
  `;

  // ---- 阶段1：列表翻页 ----
  const listExpr = `(async () => {
    ${BOOTSTRAP}
    const CATEGORY = ${JSON.stringify(CATEGORY)};
    const PROJECT = ${JSON.stringify(PROJECT)};
    const all = [];
    let offset = 0, total = 0; const limit = 50;
    const qsBase = 'keyword=&limit=' + limit + '&job_category_id_list=' + encodeURIComponent(CATEGORY) + '&tag_id_list=&location_code_list=&subject_id_list=' + PROJECT + '&recruitment_id_list=&portal_type=3&job_function_id_list=&storefront_id_list=&portal_entrance=1';
    while (true) {
      const body = { keyword: '', limit, offset, job_category_id_list: CATEGORY.split(','), tag_id_list: [], location_code_list: [], subject_id_list: [PROJECT], recruitment_id_list: [], portal_type: 3, job_function_id_list: [], storefront_id_list: [], portal_entrance: 1 };
      let res = await signed('/api/v1/search/job/posts?' + qsBase + '&offset=' + offset, body);
      // 失败重试一次
      if (res.__err) { await new Promise(r => setTimeout(r, 1000)); res = await signed('/api/v1/search/job/posts?' + qsBase + '&offset=' + offset, body); }
      if (res.__err) return { __err: res.__err, n: all.length, all };
      const d = res.data || {};
      const list = d.job_post_list || [];
      all.push(...list);
      total = d.count || total;
      offset += limit;
      if (list.length < limit) break;
      if (total && all.length >= total) break;
      await new Promise(r => setTimeout(r, 250));
    }
    return { total, n: all.length, all: all.map(x => ({
      id: x.id, title: x.title,
      recruitType: x.recruit_type && x.recruit_type.name,
      recruitParent: x.recruit_type && x.recruit_type.parent && x.recruit_type.parent.name,
      cities: (x.city_list || []).map(c => c.name),
      category: x.job_category && x.job_category.name,
      publish: x.publish_time,
      subject: x.job_subject && x.job_subject.name
    })) };
  })()`;

  console.log('[阶段1] 开始翻页拉列表…');
  const r1 = await call('Runtime.evaluate', { expression: listExpr, awaitPromise: true, returnByValue: true });
  const val1 = r1 && r1.result && r1.result.value;
  if (!val1 || val1.__err) {
    chrome.kill();
    throw new Error('列表抓取失败: ' + JSON.stringify(val1 && val1.__err).slice(0, 200));
  }
  const list = val1.all || [];
  console.log('[阶段1] 完成：total=' + val1.total + ' 实抓 ' + list.length + ' 条');

  // ---- 阶段2：逐岗拉 desc（分批，每批在独立 evaluate 里执行，避免单次挂起） ----
  const ids = list.map(p => p.id).filter(Boolean);
  const descMap = {};
  const BATCH = 100;
  for (let bi = 0; bi < ids.length; bi += BATCH) {
    const batchIds = ids.slice(bi, bi + BATCH);
    const descExpr = `(async () => {
      ${BOOTSTRAP}
      const IDS = ${JSON.stringify(batchIds)};
      const out = {};
      for (const jid of IDS) {
        try {
          const path = '/api/v1/job/posts/' + jid + '?portal_type=3&with_recommend=true';
          let sig = '';
          if (window.byted_acrawler && window.byted_acrawler.sign) { sig = await window.byted_acrawler.sign({ url: location.origin + path }); }
          const url = path + (sig ? '&_signature=' + encodeURIComponent(sig) : '');
          const r = await fetch(url);
          const j = await r.json();
          out[jid] = (j.data && j.data.job_post_detail && j.data.job_post_detail.description) || '';
        } catch (e) { out[jid] = ''; }
        await new Promise(r => setTimeout(r, 100));
      }
      return out;
    })()`;
    const rd = await call('Runtime.evaluate', { expression: descExpr, awaitPromise: true, returnByValue: true });
    const dv = rd && rd.result && rd.result.value;
    if (dv && typeof dv === 'object') Object.assign(descMap, dv);
    console.log('[阶段2] desc 进度 ' + Math.min(bi + BATCH, ids.length) + '/' + ids.length);
  }
  chrome.kill();

  return list.map(p => {
    const cityList = (p.cities || []).filter(Boolean);
    return {
      title: p.title || '',
      dept: (p.subject && (typeof p.subject === 'object' ? p.subject.name : p.subject)) || p.category || '-',
      city: cityList.join('/') || '-',
      date: p.publish ? new Date(Number(p.publish) + 8 * 3600 * 1000).toISOString().slice(0, 10) : '-',
      url: `https://jobs.bytedance.com/campus/position/${p.id}/detail`,
      desc: descMap[String(p.id)] || '',
      commitment: (p.recruitType || ''),
      recruitType: (p.recruitType || ''),
      recruitParent: (p.recruitParent || ''),
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
