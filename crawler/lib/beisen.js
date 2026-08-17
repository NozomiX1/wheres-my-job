// 北森 ATS 客户端（科大讯飞及大量用北森的国内公司）。
// 用法：node beisen.js <apiBase> <categoryCSV> <outfile>
//   北森 GetJobAdPageList 标准响应：{Data:[...], Count:N}，PageIndex 从 0 起。
//   各公司 body 可能略有差异（DisplayFields/PortalId），先 cdp_capture 抓包核对。
const fs = require('fs');
const [apiBase, categoryCSV, outfile] = process.argv.slice(2);
const CATEGORY = (categoryCSV || '2').split(',');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36';

async function getPage(pageIndex, pageSize) {
  const body = {
    PageIndex: pageIndex, PageSize: pageSize,
    Category: CATEGORY, KeyWords: '', SpecialType: 0, PortalId: '',
    DisplayFields: ['Category', 'Kind', 'LocId', 'PostDate', 'ClassificationOne', 'WorkWeChatQrCode']
  };
  const r = await fetch(apiBase, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': UA, 'Origin': new URL(apiBase).origin, 'Referer': new URL(apiBase).origin + '/', 'Accept': 'application/json, text/plain, */*' },
    body: JSON.stringify(body)
  });
  return { status: r.status, json: await r.json() };
}

(async () => {
  const PAGE = 100;
  const all = [];
  let total = 0;
  for (let page = 0; page < 50; page++) {
    const res = await getPage(page, PAGE);
    if (res.status !== 200) { console.log('STATUS ' + res.status); break; }
    const data = res.json.Data;
    const list = Array.isArray(data) ? data : (res.json.data || res.json.JobAdList || []);
    if (!Array.isArray(list)) { console.log('UNKNOWN SHAPE ' + JSON.stringify(res.json).slice(0, 300)); break; }
    all.push(...list);
    if (res.json.Count) total = res.json.Count;
    if (list.length < PAGE) break;
    if (total && all.length >= total) break;
  }
  fs.writeFileSync(outfile, JSON.stringify(all, null, 2), 'utf8');
  console.log('DONE total=' + total + ' fetched=' + all.length + ' -> ' + outfile);
})().catch(e => { console.log('ERR ' + e.message); process.exit(1); });
