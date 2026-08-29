// 打分网页生成：跳过宽召回，直接对 raw 全量岗位打分，按得分降序生成主站网页。
// 输出 ../index.html + ../2026秋招_LLM_Agent岗位筛选.html（两者内容一致）。
// 用法：node build_score_html.js
const fs = require('fs');
const path = require('path');
const { scoreJob, isGameCompany } = require('./score');
const { isIntern, isSocial, isElite, isNoise, pick } = require('./lib/filter');

const OUT = path.join(__dirname, 'out');
const CACHE = path.join(OUT, 'judge_cache');

const registry = JSON.parse(fs.readFileSync(path.join(__dirname, 'sites.json'), 'utf8')).sites;
const keyToCompany = {};
const keyToSite = {};
for (const s of registry) { keyToCompany[s.key] = s.company; keyToSite[s.key] = s; }

// 与 recall.js 一致的字段映射
const fieldMaps = {
  feishu: { title: ['title'], city: ['cities'], date: ['publish'], commitment: ['recruitType'], recruitParent: ['recruitParent'], dept: ['subject', 'category'], desc: ['description', 'jobDescription'] },
  moka: { title: ['name', 'jobTitle', 'title'], dept: ['department'], city: ['locations', 'cityList'], date: ['createdAt', 'openedAt', 'publishTime'], commitment: ['commitment'], desc: ['jobDescription', 'description'] },
  beisen: { title: ['JobAdName', 'JobName', 'name', 'title'], dept: ['ClassificationOne', 'Org'], city: ['LocNames', 'WorkLocationName', 'workPlaceName', 'city'], date: ['PostDate', 'PublishTime', 'publishTime'], commitment: ['Kind', 'Commitment', 'commitment'], desc: ['Duty', 'jobDescription', 'description'] },
  custom: { title: ['title'], dept: ['dept'], city: ['city'], date: ['date'], commitment: ['commitment'], desc: ['desc'] }
};

function buildUrl(site, id) {
  if (site.linkTemplate) return site.linkTemplate.replace(/\{id\}/g, id || '').replace(/\{orgId\}/g, site.orgId || '').replace(/\{siteId\}/g, String(site.siteId || '')).replace(/\{site\}/g, site.site || '');
  if (site.ats === 'moka') return `https://app.mokahr.com/${site.site}-recruitment/${site.orgId}/${site.siteId}#/job/${id || ''}`;
  return '';
}

const data = [];
for (const site of registry) {
  const key = site.key;
  const rawFile = path.join(OUT, key + '_raw.json');
  if (!fs.existsSync(rawFile)) continue;
  let raw = [];
  try { raw = JSON.parse(fs.readFileSync(rawFile, 'utf8')); } catch (e) { continue; }
  const jobs = Array.isArray(raw) ? raw : (raw.all || raw.list || raw.jobs || []);
  if (!Array.isArray(jobs)) continue;

  const fm = fieldMaps[site.ats] || fieldMaps.custom;
  const extra = new RegExp(site.exclude || '(?!)', 'i');
  const isGame = isGameCompany(key);

  for (const j of jobs) {
    const title = String(pick(j, fm.title, '')).trim();
    if (!title) continue;
    let desc = pick(j, fm.desc, '');
    if (desc && typeof desc === 'object') desc = '';
    desc = String(desc || '');

    // 只做硬排除（实习/社招/精英/职能），不做宽召回
    if (isIntern(j) || isSocial(j)) continue;
    if (isElite(title) || isNoise(title) || extra.test(title)) continue;

    let dept = pick(j, fm.dept, '-');
    if (dept && typeof dept === 'object') dept = dept.name || dept.title || '';
    let city = pick(j, fm.city, '-');
    if (Array.isArray(city)) city = city.map(c => (c && typeof c === 'object') ? (c.provinceName || c.name || c.cityName || c.city) : c).filter(Boolean).join('/');
    const rawDate = pick(j, fm.date, '-');
    let date = String(rawDate || '-').slice(0, 10);
    if (rawDate && Number.isFinite(Number(rawDate)) && Number(rawDate) > 1e12) date = new Date(Number(rawDate) + 8 * 3600 * 1000).toISOString().slice(0, 10);
    const id = String(pick(j, ['id', 'Id', 'JobAdId', 'jobAdId'], ''));
    const url = String(pick(j, ['url'], '') || '') || buildUrl(site, id);

    const s = scoreJob({ title, desc }, { isGame });
    data.push({
      company: keyToCompany[key] || key,
      key,
      title,
      dept: String(dept || '-'),
      city: String(city || '-'),
      date,
      url,
      score: s.total,
      titleScore: s.titleScore,
      descScore: s.descScore,
      titleTier: s.titleTier,
      descTier: s.descTier
    });
  }
}

// 按分数降序
data.sort((a, b) => (b.score - a.score) || (b.date.localeCompare(a.date)));

const ts = new Date().toISOString().slice(0, 10);
const companyCount = new Set(data.map(r => r.company)).size;

const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>2026秋招 · LLM/Agent 岗位</title>
<style>
:root{color-scheme:light;--bg:#f5f5f7;--surface:#fdfdfe;--hairline:#e8e8ed;--hover:rgba(0,0,0,.024);--ink:#1d1d1f;--ink2:#6e6e73;--muted:#86868b;--focus:#0071e3;--halo:rgba(0,113,227,.22);--segtrack:#e9e9eb;--segthumb:#fdfdfe;--segshadow:0 1px 3px rgba(0,0,0,.10);--green:#177a4c;--green-bg:#e3f2ea;--blue2:#3464d6;--blue2-bg:#e8eefc;--neutral:#5f6470;--neutral-bg:#ebebee;--red:#bb3a2e;--red-bg:#fbe9e7;--amber:#96660a;--amber-bg:#faf1da;--bar-bg:rgba(245,245,247,.82);--shadow-sm:0 1px 2px rgba(0,0,0,.05);--shadow-md:0 8px 28px rgba(0,0,0,.07);--mono:ui-monospace,"SF Mono","Cascadia Code",Consolas,monospace}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif;background:var(--bg);color:var(--ink);font-size:14px;line-height:1.55}
:focus-visible{outline:none}
button:focus-visible,select:focus-visible,a:focus-visible,input:focus-visible{box-shadow:0 0 0 4px var(--halo);border-color:var(--focus)!important}
.wrap{max-width:1080px;margin:0 auto;padding-left:22px;padding-right:22px}
.hero{padding-top:56px;padding-bottom:26px;text-align:center;max-width:1080px;margin:0 auto;padding-left:22px;padding-right:22px}
.hero h1{margin:0;font-size:clamp(26px,4vw,40px);font-weight:700;letter-spacing:-.015em;line-height:1.14}
.hero .sub{margin:12px auto 0;max-width:660px;color:var(--ink2);font-size:14px;line-height:1.6}
.searchbar{position:relative;max-width:620px;margin:24px auto 0}
.searchbar input{width:100%;padding:13px 18px 13px 46px;font:inherit;font-size:15px;color:var(--ink);background:var(--surface);border:1px solid var(--hairline);border-radius:999px;box-shadow:var(--shadow-sm)}
.searchbar input:focus{outline:none;border-color:var(--focus);box-shadow:0 0 0 4px var(--halo)}
.searchbar::before{content:'';position:absolute;left:17px;top:50%;width:16px;height:16px;transform:translateY(-50%);pointer-events:none;background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2386868b' stroke-width='2.2' stroke-linecap='round'%3E%3Ccircle cx='11' cy='11' r='7'/%3E%3Cpath d='m20 20-3.5-3.5'/%3E%3C/svg%3E") no-repeat center/contain}
.bar{position:sticky;top:0;z-index:40;background:var(--bar-bg);-webkit-backdrop-filter:saturate(180%) blur(16px);backdrop-filter:saturate(180%) blur(16px);border-bottom:1px solid var(--hairline)}
.barin{display:flex;flex-wrap:wrap;gap:9px;align-items:center;padding-top:11px;padding-bottom:11px}
.seg{display:inline-flex;gap:2px;padding:3px;background:var(--segtrack);border-radius:999px}
.segbtn{border:none;background:transparent;border-radius:999px;padding:6px 14px;font:inherit;font-size:13px;font-weight:600;color:var(--ink2);cursor:pointer;white-space:nowrap}
.segbtn .cnt{font-weight:500;opacity:.66;font-variant-numeric:tabular-nums}
.segbtn.on{background:var(--segthumb);color:var(--ink);box-shadow:var(--segshadow)}
select,button.pill{font:inherit;font-size:13px;font-weight:500;color:var(--ink);background:var(--surface);border:1px solid var(--hairline);border-radius:999px;padding:7px 14px;cursor:pointer}
.spacer{flex:1}
main{max-width:1080px;margin:0 auto;padding:24px 22px 12px}
.resulthead{display:flex;align-items:baseline;gap:8px;margin:0 4px 14px;color:var(--muted);font-size:12.5px}
.resulthead b{font-family:var(--mono);font-variant-numeric:tabular-nums;font-size:15px;font-weight:700;color:var(--ink)}
.legend{display:flex;flex-wrap:wrap;gap:14px;margin:0 4px 16px;font-size:12px;color:var(--ink2)}
.legend span{display:inline-flex;align-items:center;gap:5px}
.dot{display:inline-block;width:9px;height:9px;border-radius:999px}
.rows{background:var(--surface);border-radius:18px;box-shadow:var(--shadow-md);overflow:clip}
.row{display:flex;align-items:center;gap:16px;padding:14px 22px;border-bottom:1px solid var(--hairline)}
.row:last-child{border-bottom:none}
.row:hover{background:var(--hover)}
.scorebox{flex:0 0 74px;text-align:center}
.scorebox .num{font-family:var(--mono);font-size:24px;font-weight:700;line-height:1;font-variant-numeric:tabular-nums}
.scorebox .lbl{font-size:10.5px;color:var(--muted);margin-top:3px}
.rowmain{flex:1;min-width:0}
.l1{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.l1 .t{font-size:15px;font-weight:600;letter-spacing:-.01em;line-height:1.35}
.l2{margin-top:3px;font-size:12.5px;color:var(--ink2)}
.barwrap{margin-top:6px;height:5px;background:var(--segtrack);border-radius:999px;overflow:hidden}
.barfill{height:100%;border-radius:999px;background:var(--focus)}
.tag{display:inline-block;padding:1px 9px;border-radius:999px;font-size:11px;font-weight:600;line-height:1.7;white-space:nowrap}
.tag.应用{background:var(--green-bg);color:var(--green)}
.tag.算法{background:var(--blue2-bg);color:var(--blue2)}
.tag.infra{background:var(--neutral-bg);color:var(--neutral)}
.tag.非技术{background:var(--red-bg);color:var(--red)}
.tag.-{background:var(--neutral-bg);color:var(--muted)}
.rowside{flex:0 0 auto;display:flex;flex-direction:column;align-items:flex-end;gap:5px}
a.cta{display:inline-block;padding:6px 16px;border-radius:999px;background:#0071e3;color:#fff;font-size:12px;font-weight:600;text-decoration:none;white-space:nowrap}
.foot{max-width:1080px;margin:26px auto 0;padding:0 22px 44px;text-align:center;font-size:12px;color:var(--muted)}
@media(max-width:760px){.hero{padding-top:38px}.row{flex-wrap:wrap;gap:10px;padding:12px 16px}.scorebox{flex:0 0 58px}.scorebox .num{font-size:20px}.rowside{flex-direction:row;width:100%;justify-content:space-between}}
</style>
</head>
<body>
<section class="hero">
  <h1>下一份工作，和 AI 一起。</h1>
  <p class="sub">2026 秋招 LLM/Agent 方向校招岗位一站汇总，覆盖 ${companyCount} 家公司，按应用相关度打分排序，每天 08:00 自动更新。</p>
  <div class="searchbar"><input type="text" id="q" placeholder="搜索岗位、公司或城市"></div>
</section>

<div class="bar">
  <div class="wrap barin">
    <div class="seg" id="seg" role="group" aria-label="按标题档筛选"></div>
    <select id="fCompany" title="按公司筛选"><option value="">全部公司</option></select>
    <select id="fScore" title="按分数段筛选">
      <option value="">全部分数</option>
      <option value="hi">高分（≥83，应用）</option>
      <option value="mid">中分（49.5-83，算法）</option>
      <option value="lo">低分（16.5-49.5，infra）</option>
      <option value="zero">0-16.5（非技术）</option>
    </select>
    <div class="spacer"></div>
    <select id="mSort" title="排序">
      <option value="score">按得分</option>
      <option value="company">按公司</option>
      <option value="title">按岗位</option>
    </select>
    <button class="pill" id="mFlip" type="button">⇅</button>
  </div>
</div>

<main>
  <div class="resulthead">共 <b id="total">0</b> 个岗位</div>
  <div class="legend">
    <span><span class="dot" style="background:var(--green)"></span>应用(100)</span>
    <span><span class="dot" style="background:var(--blue2)"></span>算法(66)</span>
    <span><span class="dot" style="background:var(--neutral)"></span>infra(33)</span>
    <span><span class="dot" style="background:var(--red)"></span>非技术(0)</span>
    <span style="margin-left:8px">已排除实习/社招/精英/职能岗 · 分数 = 应用相关度（越高越靠前）</span>
  </div>
  <div class="rows" id="rows"></div>
</main>

<footer class="foot">数据由爬虫全量抓取，按 LLM/Agent 应用相关度打分排序。口径：2027届校招全职，LLM 算法与 Agent 应用方向。更新于 ${ts}</footer>

<script>
const DATA = __DATA__;
const $ = id => document.getElementById(id);
var state = { q:'', company:'', tier:'', fscore:'', sortKey:'score', sortDir:-1 };

function esc(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
function tierColor(t){return ({'应用':'var(--green)','算法':'var(--blue2)','infra':'var(--neutral)','非技术':'var(--red)'})[t]||'var(--muted)'}

function filtered(){
  var q=state.q.trim().toLowerCase();
  return DATA.filter(function(r){
    if(state.company && r.company!==state.company) return false;
    if(state.tier && r.titleTier!==state.tier) return false;
    if(state.fscore==='hi' && r.score<83) return false;
    if(state.fscore==='mid' && (r.score<49.5||r.score>=83)) return false;
    if(state.fscore==='lo' && (r.score<16.5||r.score>=49.5)) return false;
    if(state.fscore==='zero' && r.score>=16.5) return false;
    if(q){var h=(r.company+' '+r.title+' '+r.dept+' '+r.city).toLowerCase(); if(h.indexOf(q)===-1) return false;}
    return true;
  });
}
function sortRows(rows){
  var k=state.sortKey, dir=state.sortDir;
  return rows.slice().sort(function(a,b){
    if(k==='score') return (a.score-b.score)*dir;
    if(k==='company') return a.company.localeCompare(b.company,'zh')*dir;
    return a.title.localeCompare(b.title,'zh')*dir;
  });
}
function rowHtml(r){
  var pct = Math.max(0, Math.min(100, r.score));
  return '<div class="row">'+
    '<div class="scorebox"><div class="num" style="color:'+tierColor(r.titleTier)+'">'+r.score.toFixed(1)+'</div><div class="lbl">标题'+r.titleScore.toFixed(0)+' 描述'+r.descScore.toFixed(0)+'</div></div>'+
    '<div class="rowmain">'+
      '<div class="l1"><span class="t">'+esc(r.title)+'</span><span class="tag '+r.titleTier+'">'+r.titleTier+'</span><span class="tag '+r.descTier+'">描述:'+r.descTier+'</span></div>'+
      '<div class="l2">'+esc(r.company)+' · '+esc(r.city)+' · '+esc(r.date)+'</div>'+
      '<div class="barwrap"><div class="barfill" style="width:'+pct+'%;background:'+tierColor(r.titleTier)+'"></div></div>'+
    '</div>'+
    '<div class="rowside">'+(r.url?'<a class="cta" href="'+esc(r.url)+'" target="_blank" rel="noopener">投递↗</a>':'')+'</div>'+
  '</div>';
}
function render(){
  var rows=sortRows(filtered());
  $('total').textContent=rows.length;
  $('rows').innerHTML=rows.map(rowHtml).join('');
}
function buildSeg(){
  var counts={}; DATA.forEach(r=>{counts[r.titleTier]=(counts[r.titleTier]||0)+1});
  var tiers=['','应用','算法','infra','非技术'];
  var labels={ '':'全部','应用':'应用','算法':'算法','infra':'infra','非技术':'非技术' };
  var box=$('seg');
  tiers.forEach(function(t){
    if(t && !counts[t]) return;
    var n=t===''?DATA.length:counts[t];
    var b=document.createElement('button'); b.type='button'; b.className='segbtn'; b.setAttribute('data-t',t);
    b.textContent=labels[t]+' '; var s=document.createElement('span'); s.className='cnt'; s.textContent=n; b.appendChild(s);
    b.addEventListener('click',function(){ state.tier=b.getAttribute('data-t'); render(); });
    box.appendChild(b);
  });
}
function buildCompany(){
  var counts={}; DATA.forEach(r=>{counts[r.company]=(counts[r.company]||0)+1});
  var sel=$('fCompany');
  Object.keys(counts).sort((a,b)=>a.localeCompare(b,'zh')).forEach(v=>{var o=document.createElement('option');o.value=v;o.textContent=v+'（'+counts[v]+'）';sel.appendChild(o)});
}
function bind(){
  $('q').addEventListener('input',e=>{state.q=e.target.value;render()});
  $('fCompany').addEventListener('change',e=>{state.company=e.target.value;render()});
  $('fScore').addEventListener('change',e=>{state.fscore=e.target.value;render()});
  $('mSort').addEventListener('change',e=>{state.sortKey=e.target.value;render()});
  $('mFlip').addEventListener('click',function(){state.sortDir=-state.sortDir;render()});
}
buildSeg(); buildCompany(); bind(); render();
</script>
</body>
</html>`;

const out = html.replace('__DATA__', JSON.stringify(data).replace(/</g, '\\u003c'));
const destHtml = path.join(__dirname, '..', '2026秋招_LLM_Agent岗位筛选.html');
const destIndex = path.join(__dirname, '..', 'index.html');
fs.writeFileSync(destHtml, out, 'utf8');
fs.writeFileSync(destIndex, out, 'utf8');
console.log('生成 ' + destHtml + ' + index.html （岗位 ' + data.length + ' 条，按得分降序）');
