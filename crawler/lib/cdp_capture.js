// 通用逆向工具：无头 Chrome 打开页面，记录 XHR/fetch 请求(含 body)+响应(含 body)，并 dump DOM。
// 用途：给一个未知招聘站，先跑这个抓包，从输出里找到「职位列表」接口(URL/请求体/头)，再据此写专用客户端。
// 用法：node cdp_capture.js <url> <outPrefix> [waitMs=16000]
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');

const URL_IN = process.argv[2];
const OUT = process.argv[3] || 'cap';
const WAIT = Number(process.argv[4] || 16000);

const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9400 + Math.floor(Math.random() * 400);
const PROFILE = path.join(os.tmpdir(), `jobs-crawler-prof-${Date.now()}`);

function getJSON(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, res => { let d = ''; res.on('data', c => d += c); res.on('end', () => { try { resolve(JSON.parse(d)); } catch (e) { reject(e); } }); });
    req.on('error', reject); req.setTimeout(3000, () => req.destroy(new Error('timeout')));
  });
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  const chrome = spawn(CHROME, [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage',
    '--ignore-certificate-errors', '--allow-running-insecure-content',
    `--remote-debugging-port=${PORT}`, '--remote-allow-origins=*',
    `--user-data-dir=${PROFILE}`, 'about:blank'
  ], { stdio: 'ignore' });

  let target = null;
  for (let i = 0; i < 50; i++) {
    try { const list = await getJSON(`http://127.0.0.1:${PORT}/json/list`); target = list.find(t => t.type === 'page'); if (target) break; } catch (e) {}
    await sleep(500);
  }
  if (!target) { console.log('NO_TARGET'); chrome.kill(); process.exit(0); }

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  const captured = [];
  let id = 0, opener;
  const opened = new Promise(r => { opener = r; });
  ws.onopen = () => opener();

  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.method === 'Network.requestWillBeSent') {
      const r = msg.params.request;
      if (r.url.includes('/v1/') || r.url.includes('/v2/') || r.url.includes('/api/') || ['XHR', 'Fetch'].includes(msg.params.type)) {
        captured.push({ url: r.url, method: r.method, postData: msg.params.request.postData || null, reqId: msg.params.requestId, status: null, body: null });
      }
    } else if (msg.method === 'Network.responseReceived') {
      const c = captured.find(x => x.reqId === msg.params.requestId); if (c) c.status = msg.params.response.status;
    }
  };
  const call = (method, params = {}) => new Promise(res => {
    const mid = ++id; const h = (ev) => { const m = JSON.parse(ev.data); if (m.id === mid) { ws.removeEventListener('message', h); res(m.result); } };
    ws.addEventListener('message', h); ws.send(JSON.stringify({ id: mid, method, params }));
  });

  await opened;
  await call('Network.enable'); await call('Page.enable'); await call('Runtime.enable');
  await sleep(300);
  await call('Page.navigate', { url: URL_IN });
  await sleep(WAIT);

  for (const c of captured) {
    if (c.reqId) { try { const r = await call('Network.getResponseBody', { requestId: c.reqId }); if (r && r.body) c.body = r.body; } catch (e) {} }
  }

  let dom = '';
  try { const r = await call('Runtime.evaluate', { expression: 'document.documentElement.outerHTML', returnByValue: true }); dom = (r && r.result && r.result.value) || ''; } catch (e) {}

  fs.writeFileSync(`${OUT}.json`, JSON.stringify(captured, null, 2));
  fs.writeFileSync(`${OUT}.html`, dom || '');
  console.log('CAPTURED ' + captured.length);
  for (const c of captured) {
    console.log('--- ' + c.method + ' ' + c.url + ' -> ' + c.status);
    if (c.postData) console.log('   POST ' + c.postData.slice(0, 400));
    if (c.body) console.log('   BODY ' + c.body.slice(0, 250));
  }
  chrome.kill(); process.exit(0);
}
setTimeout(() => { console.log('GLOBAL_TIMEOUT'); process.exit(1); }, WAIT + 60000);
main().catch(e => { console.log('ERR ' + e.message); process.exit(1); });
