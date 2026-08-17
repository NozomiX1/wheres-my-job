// 从 CSV 生成自包含、可搜索/筛选/排序的岗位页（无外部依赖，可部署 GitHub Pages）。
//
// 【破坏性重构】完全抛弃工程风表格审美，改用 apple.com 式设计语言（taste-skill 合规版）：
//   Design Read: 工具页的消费级化身，calm / 留白优先。DIALS: VARIANCE 3 / MOTION 2 / DENSITY 5
//   - #f5f5f7 标志性浅灰底 + 白色大圆角卡片（18px），柔和着色阴影
//   - Hero 大标题短句 + Spotlight 式大胶囊搜索框；滚动后吸顶毛玻璃筛选条（玻璃为 web 近似，见注释）
//   - 类别用 Apple 分段控件（segmented control）；下拉/按钮全部胶囊化
//   - 岗位为列表流：岗位名为主角，公司/城市/部门为灰度次级信息，右侧蓝色胶囊「投递」
//   - 形状锁定：卡片 18px，除搜索框（大胶囊）外所有交互控件 999px 全圆，无其它圆角
//   - 单一动作色 Apple Blue #0071e3（暗色 #2997ff 焦点）；类别/批次色为降饱和语义状态
//   - 动效只有 hover/active 的 transform+opacity，prefers-reduced-motion 全量门控；全页零 em-dash
// 用法：node build_html.js [inputCsv] [outputHtml]
const fs = require('fs');
const path = require('path');

const CSV = process.argv[2] || path.join(__dirname, '..', '2026秋招_LLM_Agent岗位总表.csv');
const OUT = process.argv[3] || path.join(__dirname, '..', '2026秋招_LLM_Agent岗位筛选.html');

function parseCSV(text) {
  text = text.replace(/^\uFEFF/, '');
  const rows = []; let row = [], f = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else { if (c === '"') q = true; else if (c === ',') { row.push(f); f = ''; } else if (c === '\n') { row.push(f); rows.push(row); row = []; f = ''; } else if (c !== '\r') f += c; }
  }
  if (f.length || row.length) { row.push(f); rows.push(row); }
  return rows;
}
function catOf(type) {
  if (/应用|产品|Agent|评测|部署|数据/.test(type)) return '应用';
  if (/算法/.test(type)) return '算法';
  return '其他';
}

const rows = parseCSV(fs.readFileSync(CSV, 'utf8'));
const header = rows[0];
const idx = { company: header.indexOf('公司'), type: header.indexOf('类型'), title: header.indexOf('岗位'), dept: header.indexOf('部门'), city: header.indexOf('城市'), batch: header.indexOf('批次'), date: header.indexOf('发布时间'), url: header.indexOf('投递链接') };

const data = rows.slice(1).filter(r => r.length > 1 && r[idx.title]).map(r => ({
  company: (r[idx.company] || '').trim(),
  type: (r[idx.type] || '').trim(),
  cat: catOf((r[idx.type] || '')),
  title: (r[idx.title] || '').trim(),
  dept: (r[idx.dept] || '-').trim(),
  city: (r[idx.city] || '-').trim(),
  batch: (r[idx.batch] || '').trim(),
  date: (r[idx.date] || '-').trim(),
  url: (r[idx.url] || '').trim()
}));

const ts = new Date().toISOString().slice(0, 10);
const companyCount = new Set(data.map(r => r.company)).size;

const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="description" content="2026 秋招 LLM/Agent 方向校招岗位汇总：搜索、筛选、排序，每日自动更新。">
<title>2026秋招 · LLM/Agent 岗位</title>
<style>
:root{
  color-scheme:light;
  --bg:#f5f5f7;--surface:#fdfdfe;--hairline:#e8e8ed;--hover:rgba(0,0,0,.024);
  --ink:#1d1d1f;--ink2:#6e6e73;--muted:#86868b;
  --focus:#0071e3;--halo:rgba(0,113,227,.22);
  --segtrack:#e9e9eb;--segthumb:#fdfdfe;--segshadow:0 1px 3px rgba(0,0,0,.10);
  --green:#177a4c;--green-bg:#e3f2ea;
  --blue2:#3464d6;--blue2-bg:#e8eefc;
  --neutral:#5f6470;--neutral-bg:#ebebee;
  --red:#bb3a2e;--red-bg:#fbe9e7;
  --amber:#96660a;--amber-bg:#faf1da;
  --cta-bg:#0071e3;--cta-fg:#fdfdfe;
  --bar-bg:rgba(245,245,247,.82);
  --shadow-sm:0 1px 2px rgba(0,0,0,.05);
  --shadow-md:0 8px 28px rgba(0,0,0,.07);
  --mono:ui-monospace,"SF Mono","Cascadia Code",Consolas,monospace;
}
@media(prefers-color-scheme:dark){
  :root{
    color-scheme:dark;
    --bg:#161617;--surface:#1d1d1f;--hairline:#2e2e30;--hover:rgba(255,255,255,.035);
    --ink:#f5f5f7;--ink2:#a1a1a6;--muted:#86868b;
    --focus:#2997ff;--halo:rgba(41,151,255,.28);
    --segtrack:#3a3a3c;--segthumb:#5c5c60;--segshadow:0 1px 3px rgba(0,0,0,.45);
    --green:#4cc686;--green-bg:#163327;
    --blue2:#8aa6f8;--blue2-bg:#1c2a4a;
    --neutral:#a2a7b1;--neutral-bg:#26262a;
    --red:#f08a80;--red-bg:#3a211e;
    --amber:#e2b34d;--amber-bg:#3a2e13;
    --cta-bg:#f5f5f7;--cta-fg:#1d1d1f;
    --bar-bg:rgba(22,22,23,.82);
    --shadow-sm:0 1px 2px rgba(0,0,0,.4);
    --shadow-md:0 8px 28px rgba(0,0,0,.5);
  }
}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif;background:var(--bg);color:var(--ink);font-size:14px;line-height:1.55}
::selection{background:var(--halo)}
:focus-visible{outline:none}
button:focus-visible,select:focus-visible,a:focus-visible,input:focus-visible{box-shadow:0 0 0 4px var(--halo);border-color:var(--focus)!important}
.wrap{max-width:1080px;margin:0 auto;padding-left:22px;padding-right:22px}
.skip{position:absolute;left:-9999px;top:0;z-index:60;background:var(--ink);color:var(--bg);padding:8px 18px;border-radius:0 0 12px 0;font-size:13px;text-decoration:none}
.skip:focus{left:0}

/* ---- Hero：一个瞬间，不是功能清单 ---- */
.hero{padding-top:72px;padding-bottom:36px;text-align:center;max-width:1080px;margin:0 auto;padding-left:22px;padding-right:22px}
.hero h1{margin:0;font-size:clamp(30px,4.6vw,46px);font-weight:700;letter-spacing:-.015em;line-height:1.14}
.hero .sub{margin:14px auto 0;max-width:560px;color:var(--ink2);font-size:15px;line-height:1.6}
.searchbar{position:relative;max-width:620px;margin:30px auto 0}
.searchbar input{width:100%;padding:15px 20px 15px 50px;font:inherit;font-size:15px;color:var(--ink);background:var(--surface);border:1px solid var(--hairline);border-radius:999px;box-shadow:var(--shadow-sm);transition:border-color .18s,box-shadow .18s}
.searchbar input::placeholder{color:var(--muted)}
.searchbar input:hover{border-color:#d0d0d5}
.searchbar input:focus{outline:none;border-color:var(--focus);box-shadow:0 0 0 4px var(--halo)}
.searchbar::before{content:'';position:absolute;left:19px;top:50%;width:17px;height:17px;transform:translateY(-50%);pointer-events:none;background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2386868b' stroke-width='2.2' stroke-linecap='round'%3E%3Ccircle cx='11' cy='11' r='7'/%3E%3Cpath d='m20 20-3.5-3.5'/%3E%3C/svg%3E") no-repeat center/contain}

/* ---- 吸顶筛选条：毛玻璃为 web 近似（backdrop-filter 方案，非 Apple 平台原生 Liquid Glass） ---- */
.bar{position:sticky;top:0;z-index:40;background:var(--bar-bg);-webkit-backdrop-filter:saturate(180%) blur(16px);backdrop-filter:saturate(180%) blur(16px);border-bottom:1px solid var(--hairline)}
.barin{display:flex;flex-wrap:wrap;gap:9px;align-items:center;padding-top:11px;padding-bottom:11px}
.seg{display:inline-flex;gap:2px;padding:3px;background:var(--segtrack);border-radius:999px}
.segbtn{border:none;background:transparent;border-radius:999px;padding:6px 15px;font:inherit;font-size:13px;font-weight:600;color:var(--ink2);cursor:pointer;transition:color .18s,background .18s,box-shadow .18s;white-space:nowrap}
.segbtn .cnt{font-weight:500;opacity:.66;font-variant-numeric:tabular-nums}
.segbtn:hover{color:var(--ink)}
.segbtn.on{background:var(--segthumb);color:var(--ink);box-shadow:var(--segshadow)}
select,button.pill{font:inherit;font-size:13px;font-weight:500;color:var(--ink);background:var(--surface);border:1px solid var(--hairline);border-radius:999px;padding:8px 15px;cursor:pointer;transition:border-color .18s;background-clip:padding-box}
select:hover,button.pill:hover{border-color:#c9c9ce}
select{max-width:100%}
button.pill{color:var(--ink2)}
button.pill:hover{color:var(--ink)}
button.pill:active{transform:scale(.97)}
.spacer{flex:1}

/* ---- 主体 ---- */
main{max-width:1080px;margin:0 auto;padding:26px 22px 12px}
.resulthead{display:flex;align-items:baseline;gap:8px;margin:0 4px 14px;color:var(--muted);font-size:12.5px}
.resulthead b{font-family:var(--mono);font-variant-numeric:tabular-nums;font-size:15px;font-weight:700;color:var(--ink)}
.rows{background:var(--surface);border-radius:18px;box-shadow:var(--shadow-md);overflow:clip}
.row{display:flex;align-items:center;gap:18px;padding:18px 24px;border-bottom:1px solid var(--hairline);transition:background .15s}
.row:last-child{border-bottom:none}
.row:hover{background:var(--hover)}
.rowmain{flex:1;min-width:0}
.l1{display:flex;align-items:center;gap:9px;flex-wrap:wrap}
.l1 .t{font-size:15.5px;font-weight:600;letter-spacing:-.01em;line-height:1.35}
.l2{margin-top:4px;font-size:13px;color:var(--ink2)}
.l3{margin-top:3px;font-size:12.5px;color:var(--muted);word-break:break-word}
.tag{display:inline-block;padding:1.5px 10px;border-radius:999px;font-size:11.5px;font-weight:600;line-height:1.8;white-space:nowrap}
.tag.应用{background:var(--green-bg);color:var(--green)}
.tag.算法{background:var(--blue2-bg);color:var(--blue2)}
.tag.其他{background:var(--neutral-bg);color:var(--neutral)}
.badge{display:inline-block;padding:1px 8px;margin-right:7px;border-radius:999px;font-size:11px;font-weight:700;vertical-align:.5px}
.badge.social{background:var(--red-bg);color:var(--red)}
.badge.intern{background:var(--amber-bg);color:var(--amber)}
.rowside{display:flex;flex-direction:column;align-items:flex-end;gap:7px;flex:0 0 auto}
.rowside .d{font-family:var(--mono);font-variant-numeric:tabular-nums;font-size:11.5px;color:var(--muted)}
a.cta{display:inline-block;padding:8px 20px;border-radius:999px;background:var(--cta-bg);color:var(--cta-fg);font-size:13px;font-weight:600;text-decoration:none;white-space:nowrap;transition:transform .18s,box-shadow .18s,filter .18s}
a.cta:hover{filter:brightness(1.06);box-shadow:var(--shadow-sm);transform:translateY(-1px)}
a.cta:active{transform:translateY(0) scale(.97);box-shadow:none}
.nolink{color:var(--muted);font-size:13px}

/* ---- 空状态 ---- */
.empty{display:none;margin-top:20px;padding:72px 24px;text-align:center;background:var(--surface);border-radius:18px;box-shadow:var(--shadow-md)}
.empty .t1{margin:0;font-size:17px;font-weight:600}
.empty .t2{margin:8px 0 18px;font-size:13.5px;color:var(--muted)}
.empty button.linkbtn{border:none;background:none;padding:0;font:inherit;font-size:14px;font-weight:600;color:var(--focus);cursor:pointer}
.empty button.linkbtn:hover{text-decoration:underline}

/* ---- footer ---- */
.foot{max-width:1080px;margin:30px auto 0;padding:0 22px 46px;text-align:center;font-size:12px;color:var(--muted);line-height:1.7}

/* ---- 移动端显式折叠 ---- */
@media(max-width:760px){
  .hero{padding-top:44px;padding-bottom:26px}
  .hero .sub{font-size:14px}
  main{padding:18px 14px 8px}
  .barin{gap:8px}
  .segwrap{flex:1 1 100%;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none}
  .segwrap::-webkit-scrollbar{display:none}
  main,.foot{padding-left:14px;padding-right:14px}
  .row{flex-direction:column;align-items:stretch;gap:12px;padding:16px 18px}
  .rowside{flex-direction:row;align-items:center;justify-content:space-between;width:100%}
  .spacer{flex-basis:100%}
}
@media(prefers-reduced-motion:reduce){
  *,*::before,*::after{transition:none!important;animation:none!important}
}
</style>
</head>
<body>
<a class="skip" href="#rows">跳到岗位列表</a>

<section class="hero">
  <h1>下一份工作，和 AI 一起。</h1>
  <p class="sub">2026 秋招 LLM/Agent 方向校招岗位一站汇总，覆盖 ${companyCount} 家公司，每天 08:00 自动更新。</p>
  <div class="searchbar"><input type="text" id="q" placeholder="搜索岗位、公司或城市"></div>
</section>

<div class="bar">
  <div class="wrap barin">
    <div class="segwrap"><div class="seg" id="seg" role="group" aria-label="按类别筛选"></div></div>
    <select id="fCompany" title="按公司筛选"><option value="">全部公司</option></select>
    <select id="fBatch" title="按批次筛选"><option value="">全部批次</option></select>
    <div class="spacer"></div>
    <select id="mSort" title="排序字段">
      <option value="company">按公司</option><option value="title">按岗位</option><option value="cat">按类别</option>
      <option value="city">按城市</option><option value="batch">按批次</option><option value="date">按发布时间</option>
    </select>
    <button class="pill" id="mFlip" type="button" title="切换升序或降序">⇅</button>
    <button class="pill" id="reset" type="button">重置</button>
  </div>
</div>

<main>
  <div class="resulthead">共 <b id="total">0</b> 个岗位</div>
  <div class="rows" id="rows"></div>
  <div class="empty" id="empty">
    <p class="t1">没有匹配的岗位</p>
    <p class="t2">换个关键词试试，或者清空全部筛选条件</p>
    <button class="linkbtn" id="emptyReset" type="button">重置筛选</button>
  </div>
</main>

<footer class="foot">数据由爬虫与 flash 模型每日自动判定更新。口径：2027届校招全职，LLM 算法与 Agent 应用方向。更新于 ${ts}</footer>

<script>
const DATA = __DATA__;
const $ = function(id){ return document.getElementById(id); };
var state = { q:'', company:'', cat:'', batch:'', sortKey:'company', sortDir:1 };

function esc(s){
  return String(s).replace(/[&<>"]/g, function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];
  });
}
function batchKind(b){ if(/实习/.test(b)) return 'intern'; if(/社招/.test(b)) return 'social'; return ''; }
function dateVal(r){ return r.date && r.date!=='-' ? +r.date.replace(/-/g,'') : 0; }

function filtered(){
  var q = state.q.trim().toLowerCase();
  return DATA.filter(function(r){
    if(state.company && r.company!==state.company) return false;
    if(state.cat && r.cat!==state.cat) return false;
    if(state.batch && r.batch!==state.batch) return false;
    if(q){
      var h=(r.company+' '+r.title+' '+r.dept+' '+r.city+' '+r.batch+' '+r.type).toLowerCase();
      if(h.indexOf(q)===-1) return false;
    }
    return true;
  });
}
function sortRows(rows){
  var k=state.sortKey, dir=state.sortDir;
  return rows.slice().sort(function(a,b){
    var x=a[k]||'', y=b[k]||'';
    if(k==='date'){ return (dateVal(a)-dateVal(b))*dir; }
    if(k==='cat'){ var o={应用:0,算法:1,其他:2}; return ((o[x]!==undefined?o[x]:3)-(o[y]!==undefined?o[y]:3))*dir; }
    return String(x).localeCompare(String(y),'zh')*dir;
  });
}
function rowHtml(r){
  var kb = batchKind(r.batch);
  var badge = kb ? '<span class="badge '+(kb==='intern'?'intern':'social')+'">'+(kb==='intern'?'实习':'社招')+'</span>' : '';
  var sub = esc(r.dept)+' · '+esc(r.batch);
  return '<div class="row">'+
    '<div class="rowmain">'+
      '<div class="l1"><span class="t">'+esc(r.title)+'</span><span class="tag '+r.cat+'">'+r.cat+'</span></div>'+
      '<div class="l2">'+esc(r.company)+' · '+esc(r.city)+'</div>'+
      '<div class="l3">'+badge+sub+'</div>'+
    '</div>'+
    '<div class="rowside">'+
      (r.date && r.date!=='-' ? '<div class="d">'+esc(r.date)+'</div>' : '')+
      (r.url ? '<a class="cta" href="'+esc(r.url)+'" target="_blank" rel="noopener">投递 ↗</a>' : '<span class="nolink">暂无链接</span>')+
    '</div>'+
  '</div>';
}
function render(){
  var rows = sortRows(filtered());
  $('total').textContent = rows.length;
  $('empty').style.display = rows.length ? 'none' : 'block';
  $('rows').style.display = rows.length ? '' : 'none';
  $('rows').innerHTML = rows.map(rowHtml).join('');
  if($('mSort').value!==state.sortKey) $('mSort').value = state.sortKey;
  var btns = document.querySelectorAll('#seg .segbtn');
  for(var i=0;i<btns.length;i++){
    btns[i].classList.toggle('on', btns[i].getAttribute('data-c')===state.cat);
  }
}
function doReset(){
  state={ q:'', company:'', cat:'', batch:'', sortKey:'company', sortDir:1 };
  $('q').value=''; $('fCompany').value=''; $('fBatch').value='';
  render();
}
function buildSeg(){
  var counts={};
  DATA.forEach(function(r){ counts[r.cat]=(counts[r.cat]||0)+1; });
  var cats=['全部','应用','算法','其他'];
  var box=$('seg');
  cats.forEach(function(c){
    if(c==='其他' && !counts['其他']) return;
    var n = c==='全部' ? DATA.length : counts[c];
    var b=document.createElement('button');
    b.type='button'; b.className='segbtn'; b.setAttribute('data-c', c==='全部'?'':c);
    b.textContent = c+' ';
    var s=document.createElement('span'); s.className='cnt'; s.textContent=n; b.appendChild(s);
    b.addEventListener('click', function(){ state.cat = b.getAttribute('data-c'); render(); });
    box.appendChild(b);
  });
}
function buildCompanySelect(){
  var counts={};
  DATA.forEach(function(r){ counts[r.company]=(counts[r.company]||0)+1; });
  var sel=$('fCompany');
  Object.keys(counts).sort(function(a,b){return a.localeCompare(b,'zh');}).forEach(function(v){
    var o=document.createElement('option'); o.value=v; o.textContent=v+'（'+counts[v]+'）'; sel.appendChild(o);
  });
}
function buildBatchSelect(){
  var vals=[]; var seen={};
  DATA.forEach(function(r){ if(r.batch && !seen[r.batch]){ seen[r.batch]=1; vals.push(r.batch); } });
  vals.sort(function(a,b){return a.localeCompare(b,'zh');});
  var sel=$('fBatch');
  vals.forEach(function(v){ var o=document.createElement('option'); o.value=v; o.textContent=v; sel.appendChild(o); });
}
function bind(){
  $('q').addEventListener('input', function(e){ state.q=e.target.value; render(); });
  $('fCompany').addEventListener('change', function(e){ state.company=e.target.value; render(); });
  $('fBatch').addEventListener('change', function(e){ state.batch=e.target.value; render(); });
  $('mSort').addEventListener('change', function(e){ state.sortKey=e.target.value; render(); });
  $('mFlip').addEventListener('click', function(){ state.sortDir=-state.sortDir; render(); });
  $('reset').addEventListener('click', doReset);
  $('emptyReset').addEventListener('click', doReset);
}
buildSeg(); buildCompanySelect(); buildBatchSelect(); bind(); render();
</script>
</body>
</html>`;

const out = html.replace('__DATA__', JSON.stringify(data).replace(/</g, '\\u003c'));
fs.writeFileSync(OUT, out, 'utf8');
console.log('生成 ' + OUT + ' （岗位 ' + data.length + ' 条）');
