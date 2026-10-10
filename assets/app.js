
'use strict';
// Native search UI. Data is published separately; keyword preferences never remove jobs.
const DATA=globalThis.ANDE_DATA||{version:1,companies:[],sources:[],jobs:[],notices:['岗位数据暂不可用，请稍后再试。']};
const JOBS=DATA.jobs; // 线上目录不带岗位；只有测试或旧格式目录会带
const jobCache=new Map(JOBS.map(j=>[j.id,j])); // 点开过的岗位完整内容
const {ALIBABA_UNITS,UNIT_ALIASES,unitNames,unitName,matchFields,hitText,score,matchesRecruitment,reliableDate,collect:rankJobs}=globalThis.ANDE_RANK(DATA); // 打分与单位归属见 rank.js，服务端共用
// Display units only: keep source identity, raw company and all job facts untouched.
const RETIRED_ALIBABA_SELECTION='旧阿里招聘范围（已退出）';
const GROUP_INITIALS={'千问事业部':'Q','千问办公':'Q','平头哥':'P','淘宝闪购':'T','灵犀互娱':'L','盒马':'H','虎鲸文娱集团':'H','阿里健康':'A','飞猪':'F','高德地图':'G','阿里校园招聘入口':'A'};
const COMPANIES=(()=>{
  const units=DATA.companies.map(c=>({...c,name:c.name==='阿里巴巴'?ALIBABA_UNITS[0]:c.name})),known=new Set(units.map(c=>c.name));
  for(const name of new Set((DATA.parts||JOBS).flatMap(unitNames)))if(!known.has(name)){
    units.push({name,initial:GROUP_INITIALS[name]||(/^[a-z]/i.test(name)?name[0].toUpperCase():'#'),aliases:[]});known.add(name);
  }
  return units.sort((a,b)=>a.initial.localeCompare(b.initial)||a.name.localeCompare(b.name,'zh'));
})();
const RECRUITMENT_TYPES=[['all','全部'],['social','社招'],['campus','校招'],['internship','实习'],['talent','人才计划']];
const PREFERENCES_KEY='ande.preferences.v1';
// Two equal-priority word groups; negative terms affect net points only.
const WORD_KINDS=['keywords','downrank'];
const EXAMPLE_KEYWORDS=globalThis.ANDE_EXAMPLES?.keywords||[];
const EXAMPLE_DOWNRANK=globalThis.ANDE_EXAMPLES?.downrank||[];
const state={keywords:[],downrank:[],drafts:{keywords:'',downrank:''},editing:{keywords:null,downrank:null},feedback:{keywords:'',downrank:''},selected:new Set(),recruitment:'all',searched:false,active:null,results:[],total:0,matched:0,penalized:0,focused:null};
let preferencesMessage='';
let queryGeneration=0,loadMessage=globalThis.ANDE_DATA?'':'岗位目录加载失败，请刷新页面后再试。';
function updateLoadStatus(message){loadMessage=message;if($('dataLoadNotice')){$('dataLoadNotice').textContent=message;$('dataLoadNotice').hidden=!message;}}
const directory={query:'',letter:''};
let observer=null;
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon=(name)=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+({search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/>',building:'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 7h1m4 0h1M9 11h1m4 0h1M9 15h1m4 0h1M10 21v-3h4v3"/>',arrow:'<path d="M5 12h14m-5-5 5 5-5 5"/>',file:'<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8m-8 4h5"/>',logo:'<path d="M5 5h14M5 12h9M5 19h5"/><path d="m15 17 2 2 4-5"/>'}[name]||'')+'</svg>';
const githubIcon='<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .75a11.25 11.25 0 0 0-3.56 21.92c.56.1.77-.24.77-.54v-2.1c-3.14.68-3.8-1.33-3.8-1.33-.51-1.3-1.25-1.64-1.25-1.64-1.02-.7.08-.69.08-.69 1.13.08 1.73 1.16 1.73 1.16 1 1.72 2.63 1.22 3.27.93.1-.72.39-1.22.71-1.5-2.51-.29-5.15-1.25-5.15-5.57 0-1.23.44-2.23 1.16-3.02-.12-.29-.5-1.43.11-2.98 0 0 .95-.3 3.1 1.15a10.8 10.8 0 0 1 5.64 0c2.15-1.45 3.1-1.15 3.1-1.15.61 1.55.23 2.69.11 2.98.72.79 1.16 1.8 1.16 3.02 0 4.33-2.64 5.27-5.16 5.55.4.35.76 1.03.76 2.08v3.11c0 .3.2.65.78.54A11.25 11.25 0 0 0 12 .75Z"/></svg>';
const wordKey=word=>word.trim().toLowerCase();
function restorePreferences(){
  try{
    const raw=localStorage.getItem(PREFERENCES_KEY);if(!raw)return;
    const saved=JSON.parse(raw);
    if(saved?.version!==1||!WORD_KINDS.every(k=>Array.isArray(saved[k])&&saved[k].every(w=>typeof w==='string'))||!Array.isArray(saved.selected)||!saved.selected.every(n=>typeof n==='string')||saved.recruitment!==undefined&&!RECRUITMENT_TYPES.some(([type])=>type===saved.recruitment))throw new Error('Invalid preferences');
    for(const kind of WORD_KINDS){const seen=new Set();state[kind]=saved[kind].map(w=>w.trim()).filter(w=>{const key=wordKey(w);if(!key||/[,，、;；\n\r]/.test(w)||seen.has(key))return false;seen.add(key);return true;});}
    state.selected=new Set(saved.selected.flatMap(n=>n==='阿里巴巴'?ALIBABA_UNITS:[n==='阿里招聘（部门待核）'?RETIRED_ALIBABA_SELECTION:n]));
    state.recruitment=saved.recruitment??'all';
    preferencesMessage=[...state.selected].some(n=>!COMPANIES.some(c=>c.name===n))?'部分已保存范围已退出或不在当前目录；请移除其标签或重新选择，尚未自动查询。':'';
  }catch{preferencesMessage='本机设置不可用，当前页面仍可使用；可清空后重新保存。';}
}
function persistPreferences(){
  try{localStorage.setItem(PREFERENCES_KEY,JSON.stringify({version:1,keywords:state.keywords,downrank:state.downrank,selected:[...state.selected],recruitment:state.recruitment}));preferencesMessage='';}
  catch{preferencesMessage='本机保存不可用，设置暂时只保留在当前页面。';}
}
function queryDirty(){
  if(!state.active)return false;
  return state.recruitment!==state.active.recruitment||WORD_KINDS.some(k=>state.drafts[k].trim()||state.editing[k]!==null)||JSON.stringify(state.keywords)!==JSON.stringify(state.active.words)||JSON.stringify(state.downrank)!==JSON.stringify(state.active.lowered)||JSON.stringify([...state.selected].sort())!==JSON.stringify(state.active.selected);
}
function updateFormStatus(){
  if($('preferencesNotice')){$('preferencesNotice').textContent=preferencesMessage;$('preferencesNotice').hidden=!preferencesMessage;}
  if($('queryNotice'))$('queryNotice').hidden=!queryDirty();
}
function updateWordEditor(kind){
  const list=$(kind+'Words');
  list.innerHTML=state[kind].map((word,i)=>`<span class="word-token ${state.editing[kind]===i?'is-editing':''}"><button type="button" class="word-label" data-edit-word="${i}" data-kind="${kind}" title="点击修改" aria-label="修改${kind==='keywords'?'优先词':'降权词'} ${esc(word)}">${esc(word)}</button><button type="button" class="word-remove" data-remove-word="${i}" data-kind="${kind}" aria-label="删除${kind==='keywords'?'优先词':'降权词'} ${esc(word)}">×</button></span>`).join('');
  if($(kind).value!==state.drafts[kind])$(kind).value=state.drafts[kind];
  const editing=state.editing[kind]!==null;
  const add=document.querySelector(`[data-add-word="${kind}"]`);add.textContent=editing?'保存':'添加';add.setAttribute('aria-label',(editing?'保存':'添加')+(kind==='keywords'?'优先词':'降权词'));
  const cancel=document.querySelector(`[data-cancel-word="${kind}"]`);cancel.hidden=!editing&&!state.drafts[kind];cancel.textContent=editing?'取消':'清空输入';
  $(kind+'Feedback').textContent=state.feedback[kind];$(kind+'Feedback').hidden=!state.feedback[kind];
}
function addWord(kind,text,index=null,clearDraft=true){
  const word=text.trim();
  if(!word||/[,，、;；\n\r]/.test(word)){state.feedback[kind]=word?'一次只添加一个词或短语，不需要使用分隔符。':state.editing[kind]!==null?'请输入一个词，或取消当前编辑。':'请输入一个词或短语。';updateWordEditor(kind);$(kind).focus();return false;}
  const duplicate=state[kind].findIndex((w,i)=>i!==index&&wordKey(w)===wordKey(word));
  if(duplicate>=0&&index!==null){state.feedback[kind]='列表中已有这个词，请换一个词或取消编辑。';updateWordEditor(kind);$(kind).focus();return false;}
  if(duplicate<0){if(index===null)state[kind].push(word);else state[kind][index]=word;persistPreferences();}
  if(clearDraft){state.drafts[kind]='';state.editing[kind]=null;}
  const other=kind==='keywords'?'downrank':'keywords';
  state.feedback[kind]=state[other].some(w=>wordKey(w)===wordKey(word))?'这个词同时在两组中，本轮正负贡献会相抵。':duplicate>=0?'已有这个词，不重复添加或计分。':'';
  updateWordEditor(kind);updateFormStatus();$(kind).focus();return true;
}
function commitWord(kind){state.drafts[kind]=$(kind).value;return addWord(kind,state.drafts[kind],state.editing[kind]);}
function cancelWord(kind){state.drafts[kind]='';state.editing[kind]=null;state.feedback[kind]='';updateWordEditor(kind);updateFormStatus();$(kind).focus();}
function editWord(kind,index){
  if(!Number.isInteger(index)||index<0||index>=state[kind].length)return;
  if(state.drafts[kind].trim()&&state.editing[kind]!==index){state.feedback[kind]='请先添加或取消当前输入，再修改其他词。';updateWordEditor(kind);$(kind).focus();return;}
  state.editing[kind]=index;state.drafts[kind]=state[kind][index];state.feedback[kind]='';updateWordEditor(kind);updateFormStatus();$(kind).focus();$(kind).select();
}
function removeWord(kind,index){
  if(!Number.isInteger(index)||index<0||index>=state[kind].length)return;
  state[kind].splice(index,1);
  if(state.editing[kind]===index){state.editing[kind]=null;state.drafts[kind]='';}else if(state.editing[kind]!==null&&state.editing[kind]>index)state.editing[kind]--;
  state.feedback[kind]='';persistPreferences();updateWordEditor(kind);updateFormStatus();$(kind).focus();
}
function fillExample(){
  if(!globalThis.ANDE_EXAMPLES){preferencesMessage='示例词未加载，请刷新后再试；自定义条件仍可使用。';updateFormStatus();return;}
  for(const kind of WORD_KINDS){
    const seen=new Set(state[kind].map(wordKey));
    for(const word of kind==='keywords'?EXAMPLE_KEYWORDS:EXAMPLE_DOWNRANK){const key=wordKey(word);if(!seen.has(key)){state[kind].push(word);seen.add(key);}}
  }
  for(const kind of WORD_KINDS){
    const other=kind==='keywords'?'downrank':'keywords';
    state.feedback[kind]=state[kind].some(w=>state[other].some(otherWord=>wordKey(w)===wordKey(otherWord)))?'有词同时在两组中，本轮正负贡献会相抵。':'';
    updateWordEditor(kind);
  }
  persistPreferences();updateFormStatus();
}
function clearSettings(){
  queryGeneration++;loadMessage='';
  for(const kind of WORD_KINDS){state[kind]=[];state.drafts[kind]='';state.editing[kind]=null;state.feedback[kind]='';}
  state.selected.clear();state.recruitment='all';directory.query='';directory.letter='';state.searched=false;state.active=null;state.results=[];state.total=0;state.matched=0;state.penalized=0;state.focused=null;
  try{localStorage.removeItem(PREFERENCES_KEY);preferencesMessage='';}catch{preferencesMessage='本页面已清空，但浏览器不允许清除本机保存的设置。';}
  render();window.scrollTo({top:0,behavior:'auto'});$('keywords').focus();
}
function recruitmentLabels(job){
  const labels=(job.channels||[]).map(type=>type==='campus'?'校招':'社招');
  if(job.employment==='internship')labels.push('实习');
  if(job.employment==='full-time')labels.push('全职');
  if(job.talentPlan===true)labels.push('人才计划');
  if(!job.channels?.length)labels.push('渠道未明确');
  if(job.employment==null)labels.push('性质未明确');
  return labels;
}
function scoreText(value){return state.active?.words.length||state.active?.lowered?.length?value.toFixed(2):'—';}
const collect=(query,selected)=>rankJobs(JOBS,query,selected); // 测试用；线上排序在服务端
function dateHTML(job){const date=reliableDate(job);return date?`${job.dateKind==='published'?'发布':'官网更新'} <time datetime="${esc(date)}">${esc(date)}</time>`:'官网日期未明确';}
function safeUrl(url){try{const u=new URL(url);return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password?u.href:'';}catch{return '';}}
function applyHTML(job){const url=safeUrl(job.url);return url?`<a class="apply-link" data-role="apply" href="${esc(url)}" target="_blank" rel="noopener noreferrer">前往官网 ↗</a>`:'<button type="button" class="apply-link" data-role="apply" disabled title="官方链接暂不可用">官网暂不可用</button>';}
function sourceStatusHTML(job){return job.sourceStatus&&job.sourceStatus!=='open'?`<span class="job-track job-source-status" title="实际招聘及投递可用性请以官网为准">官网接口状态：${esc(job.sourceStatus)}</span>`:'';}
function jdNotice(job){const body=[job.duty,job.requirements,job.description].filter(Boolean).join('\n');const content=body.replace(/^(?:部门介绍|岗位描述|岗位职责|岗位基本要求|具备以下条件优先|岗位亮点|岗位摘要|工作职责|任职要求|加分项|投递说明|面向对象)\r?$/gm,'');if(job.jdComplete===false&&['meituan_social','mihoyo','mihoyo_social'].includes(job.sourceKey)&&body&&!/[\p{L}\p{N}]/u.test(content))return '官网当前提供的正文为空白或占位描述';return body?(/[\p{L}\p{N}]/u.test(body)?'正文完整性尚未核验':'当前仅有占位描述，尚无完整 JD'):'本站尚未同步完整 JD';}
function header(){return `<header class="site-head"><a class="brand" href="index.html" aria-label="安得首页"><span class="brand-icon">${icon('logo')}</span>安得</a><a class="github-link" href="https://github.com/NozomiX1/wheres-my-job" target="_blank" rel="noopener noreferrer" aria-label="GitHub 仓库" title="GitHub 仓库">${githubIcon}</a></header>`;}
function bjDate(iso){const t=Date.parse(iso);return Number.isNaN(t)?'':new Date(t).toLocaleDateString('sv-SE',{timeZone:'Asia/Shanghai'});}
function footer(){const latest=(DATA.sources||[]).map(s=>bjDate(s.lastSuccess)).filter(Boolean).sort().pop();return `<footer class="footer"><p>岗位来自各公司官网公开列表，岗位是否在招及申请条件以官网为准。${latest?` 数据最近更新：${latest}。`:''}</p></footer>`;}
function wordEditor(kind){
  const positive=kind==='keywords';
  return `<section class="word-editor" data-keyword-editor="${kind}" aria-labelledby="${kind}Label"><div class="word-heading"><label id="${kind}Label" for="${kind}">${positive?'优先词':'降权词'}</label></div><p class="word-hint" id="${kind}Hint">${positive?'填写想优先看的方向、技能或工作内容，命中会加分。':'填写不太想看的方向或工作内容，命中会扣分。'}</p><div class="word-list" id="${kind}Words" role="group" aria-label="${positive?'已添加的优先词':'已添加的降权词'}"></div><div class="word-entry"><textarea id="${kind}" class="field" data-word-input="${kind}" rows="1" placeholder="添加一个词或短语" autocomplete="off" spellcheck="false" aria-describedby="${kind}Hint ${kind}Feedback">${esc(state.drafts[kind])}</textarea><button type="button" class="secondary" data-add-word="${kind}" title="回车也可添加">添加</button><button type="button" class="cancel-word" data-cancel-word="${kind}" hidden>取消</button></div><p class="word-feedback" id="${kind}Feedback" role="status" aria-live="polite" hidden></p></section>`;
}
function companyEditor(){return `<section class="company-editor" aria-labelledby="companyLabel"><div class="word-heading"><span class="label" id="companyLabel">招聘单位</span><span id="companyScopeEmpty">全部单位</span></div><div class="word-list" id="companyTags" role="group" aria-label="已选择招聘单位"></div><div class="company-directory" id="companyDirectory"><div class="company-panel"><label class="directory-search">${icon('search')}<input id="companySearch" type="search" value="${esc(directory.query)}" placeholder="搜索单位或别名" aria-label="搜索招聘单位名称或别名" autocomplete="off" spellcheck="false"></label><div class="alphabet" id="companyAlphabet" role="group" aria-label="按招聘单位名称首字母筛选"></div><div class="company-grid" id="companyOptions"></div></div></div></section>`;}
function recruitmentEditor(){return `<section class="recruitment-editor" aria-labelledby="recruitmentLabel"><div class="word-heading"><span class="label" id="recruitmentLabel">招聘类型</span></div><div class="recruitment-filters" id="recruitmentFilters" role="group" aria-labelledby="recruitmentLabel">${RECRUITMENT_TYPES.map(([type,label])=>`<button type="button" class="recruitment-choice" data-recruitment="${type}" aria-pressed="${state.recruitment===type}">${label}</button>`).join('')}</div></section>`;}
function commonForm(){return `<form class="keyword-form" data-search-form>${wordEditor('keywords')}${wordEditor('downrank')}${recruitmentEditor()}${companyEditor()}<div class="search-actions"><div class="condition-actions"><button type="button" class="text-button" data-action="clear-settings">重置筛选和关键词</button><button type="button" class="text-button" data-action="fill-example">填入示例</button></div><button class="primary" type="submit">${icon('search')} 查找岗位</button></div><p class="word-feedback" id="preferencesNotice" role="status" hidden></p><p class="query-notice" id="dataLoadNotice" role="status" ${loadMessage?'':'hidden'}>${esc(loadMessage)}</p><p class="query-notice" id="queryNotice" role="status" hidden>条件已更改，查找后更新；下面仍是上次结果。</p></form>`;}
function homeHTML(){return `<div class="wrap ${state.searched?'searched':''}">${header()}<main class="hero-a apple-home"><h1>安得岗位千万件，<br><span>大庇天下寒士俱欢颜。</span></h1><div class="search-card">${commonForm()}</div></main>${state.searched?resultsShell():''}${footer()}</div>`;}
function resultsShell(){const matches=state.matched,penalized=state.penalized;const hasWords=state.active.words.length||state.active.lowered.length;return `<section class="results" id="results"><div class="results-heading"><div><h2>岗位 <span class="muted count" style="font-weight:450;font-size:12px">${state.total} 个</span></h2><p>${hasWords?`${matches} 个优先词命中 · ${penalized} 个降权 · 当前范围全部保留`:'可靠官网日期优先 · 未明确日期放后'}</p></div><span class="result-order">${hasWords?'匹配分优先':'日期优先'} ↓</span></div>${state.results.some(r=>!r.job.jdComplete)?'<p class="ranking-note">部分岗位尚未同步或核验完整 JD；匹配分仅基于当前可用文字，请以官网为准。</p>':''}${state.active.words.length&&!matches&&state.total?'<p class="ranking-note">暂无优先词命中，岗位仍全部保留。</p>':''}<div id="workListScroll"><div class="job-list" id="jobList"></div><div class="scroll-sentinel" id="scrollSentinel"></div></div></section>`;}
function rowHTML(r){const j=r.job;return `<article class="job-row ${state.focused===j.id?'active':''}" data-job-row="${esc(j.id)}"><div class="job-score ${r.value===0?'is-zero':''}" title="关键词匹配分，不是岗位质量或录取概率"><strong data-match-score>${scoreText(r.value)}</strong><span>匹配分</span></div><div class="job-body"><div class="job-title-line"><button class="job-title" type="button" data-job="${esc(j.id)}">${esc(j.title)}</button>${recruitmentLabels(j).map(label=>`<span class="job-track">${esc(label)}</span>`).join('')}${sourceStatusHTML(j)}</div><div class="job-meta"><span>${esc(unitName(j))}</span><span>·</span>${j.category?`<span class="job-category">${esc(j.category)}</span><span>·</span>`:''}<span>${esc(j.city)}</span><span>·</span>${dateHTML(j)}</div>${state.active.words.length||state.active.lowered.length?`<div class="job-signals">${state.active.words.length?`<span class="match-label">${r.matched.length?'优先命中':'未命中优先词'}</span>${r.matched.map((w,i)=>`<span class="word-tag">${esc(r.matchedText?.[i]??hitText(j,w))}</span>`).join('')}`:''}${r.downranked.length?`<span class="match-label">降权</span>${r.downranked.map((w,i)=>`<span class="word-tag">${esc(r.downrankedText?.[i]??hitText(j,w))}</span>`).join('')}`:''}</div>`:''}</div><div class="job-tail"><button type="button" class="secondary" data-job="${esc(j.id)}">查看 JD</button>${applyHTML(j)}</div></article>`;}
function fillRows(){
  if(!state.results.length){$('jobList').style.border='0';$('jobList').innerHTML=`<div class="empty">${icon('search')}<h3>当前范围没有可显示的岗位</h3><p>当前所选招聘单位或招聘类型范围没有可用数据。这不表示官网没有招聘。</p><button class="secondary" data-action="open-companies">检查单位范围</button></div>`;$('scrollSentinel').textContent='';return;}
  $('jobList').innerHTML=state.results.map(rowHTML).join('');
  $('scrollSentinel').textContent=state.results.length<state.total?`继续下滑 · 已展示 ${state.results.length} / ${state.total} 个岗位`:`已展示当前范围 ${state.total} 个岗位`;
}
let loadingMore=false;
async function loadMore(){
  if(loadingMore||state.results.length>=state.total)return;
  loadingMore=true;const generation=queryGeneration;
  try{
    const page=await queryPage(state.active,state.results.length);
    if(generation!==queryGeneration)return;
    state.results.push(...page.items.map(toResult));fillRows();
  }catch(error){if(generation===queryGeneration)$('scrollSentinel').textContent=error.message+' 继续下滑可重试。';}
  finally{loadingMore=false;}
}
function setupScroll(){
  if(observer)observer.disconnect();
  if(!state.searched||!state.results.length||!('IntersectionObserver'in window))return;
  const root=null;
  observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)&&state.results.length<state.total)loadMore();},{root,rootMargin:'160px'});
  observer.observe($('scrollSentinel'));
}
function highlight(text){const words=[...(state.active?.words||[]),...(state.active?.lowered||[])];if(!words.length)return esc(text);const pattern=words.map(w=>w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|');return text.split(new RegExp(`(${pattern})`,'gi')).map((s,i)=>i%2?`<mark>${esc(s)}</mark>`:esc(s)).join('');}
function detailHTML(id){const j=jobCache.get(id);if(!j)return '';const scored=score(j,state.active||{words:[]}),match=scored.matched;return `<div class="detail-head"><h2>${esc(j.title)}</h2><p>${esc(unitName(j))}${j.category?` · ${esc(j.category)}`:''} · ${esc(j.city||'地点未明确')} · ${recruitmentLabels(j).map(esc).join(' · ')}</p><p>${dateHTML(j)} · 匹配分 <span data-match-score>${scoreText(scored.value)}</span></p>${sourceStatusHTML(j)?`<p>${sourceStatusHTML(j)} · 实际招聘及投递可用性请以官网为准。</p>`:''}</div>${state.active?.words.length||state.active?.lowered.length?`<details class="detail-section detail-why"><summary>为什么排在这里 · 匹配分 ${scoreText(scored.value)}</summary><p>优先词加分 ${scored.positive.toFixed(2)} − 降权词扣分 ${scored.penalty.toFixed(2)} = ${scored.value.toFixed(2)}。降权力度暂定；分数仅反映当前可用文字，不评价岗位质量。</p><div class="chips">${match.map(w=>`<span class="word-tag">优先 · ${esc(hitText(j,w))}</span>`).join('')}${scored.downranked.map(w=>`<span class="word-tag">降权 · ${esc(hitText(j,w))}</span>`).join('')}</div></details>`:''}${j.description?`<section class="detail-section"><h3>岗位正文</h3><p>${highlight(j.description)}</p></section>`:''}${j.duty&&(!j.description||!j.description.includes(j.duty))?`<section class="detail-section"><h3>工作职责</h3><p>${highlight(j.duty)}</p></section>`:''}${j.requirements&&(!j.description||!j.description.includes(j.requirements))?`<section class="detail-section"><h3>任职要求</h3><p>${highlight(j.requirements)}</p></section>`:''}${!j.jdComplete?`<p class="detail-disclaimer">${jdNotice(j)}，请前往官网查看。岗位是否仍在招聘及申请条件以官网为准。</p>`:''}`;}
function setDetail(id){$('modalDetail').innerHTML=detailHTML(id);const j=jobCache.get(id);$('detailApply').innerHTML=j?applyHTML(j):'';}
function renderDirectory(){
  const totals=Object.create(null);(DATA.parts||JOBS).forEach(item=>{
    if(DATA.parts&&item.unitCounts){for(const [name,count]of Object.entries(item.unitCounts)){const unit=UNIT_ALIASES[name]||name;totals[unit]=(totals[unit]||0)+count;}}
    else for(const name of unitNames(item))totals[name]=(totals[name]||0)+(DATA.parts?item.count:1);
  });
  const available=new Set(COMPANIES.map(c=>c.initial));
  $('companyAlphabet').innerHTML=['',...'ABCDEFGHIJKLMNOPQRSTUVWXYZ','#'].map(l=>`<button class="letter ${directory.letter===l?'on':''}" type="button" data-letter="${l}" aria-pressed="${directory.letter===l}" ${l&&!available.has(l)?'disabled':''}>${l||'全部'}</button>`).join('');
  const q=directory.query.trim().toLowerCase();const companies=COMPANIES.filter(c=>(!directory.letter||c.initial===directory.letter)&&(!q||(c.name+' '+c.aliases).toLowerCase().includes(q)));
  $('companyOptions').innerHTML=companies.length?companies.map(c=>{const sourceKeys=new Set((DATA.parts||JOBS).filter(item=>unitNames(item).includes(c.name)).map(item=>item.sourceKey)),sources=(DATA.sources||[]).filter(s=>unitName(s)===c.name||sourceKeys.has(s.key)),count=totals[c.name]||0;const pending=sources.some(s=>s.status!=='ready'),oldest=sources.map(s=>bjDate(s.lastSuccess)).filter(Boolean).sort()[0];const caption=count?`${count} 个岗位${oldest?` · ${oldest.slice(5)} 更新`:''}${sources.some(s=>s.status==='failed')?' · 最近更新失败':''}`:pending?'暂无数据':'0 个岗位';return `<label class="company-option ${state.selected.has(c.name)?'chosen':''}"><input type="checkbox" data-company="${esc(c.name)}" ${state.selected.has(c.name)?'checked':''}><span class="company-copy"><span class="company-name" style="display:block">${esc(c.name)}</span><span class="company-count ${pending?'warning':''}" style="display:block">${caption}</span></span></label>`}).join(''):'<div class="company-empty">目录没有匹配项，不代表该单位没有招聘。</div>';
}
function renderSelection(){
  const list=$('companyTags');
  list.innerHTML=[...state.selected].map(name=>`<span class="word-token"><span class="company-tag-name">${esc(name)}</span><button type="button" class="word-remove" data-remove-company="${esc(name)}" aria-label="移除招聘单位 ${esc(name)}">×</button></span>`).join('');
  $('companyScopeEmpty').hidden=state.selected.size>0;
  document.querySelectorAll('[data-company]').forEach(input=>{input.checked=state.selected.has(input.dataset.company);input.closest('.company-option').classList.toggle('chosen',input.checked);});
}
function render(){
  if(observer)observer.disconnect();
  $('app').innerHTML=homeHTML();
  for(const kind of WORD_KINDS)updateWordEditor(kind);
  renderDirectory();renderSelection();
  if(state.searched){fillRows();setupScroll();}
  updateFormStatus();
}
const PAGE_SIZE=50;
async function fetchJSON(url,options){
  const response=await fetch(url,options).catch(()=>{throw new Error('无法连接服务器。');});
  if(!response.ok){const body=await response.json().catch(()=>({}));throw new Error(body.error||'服务暂不可用（HTTP '+response.status+'）。');}
  return response.json();
}
const queryPage=(query,offset)=>fetchJSON('api/search',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({words:query.words,lowered:query.lowered,selected:query.selected,recruitment:query.recruitment,offset,limit:PAGE_SIZE})});
const toResult=item=>({job:item,value:item.value,matched:item.matched,downranked:item.downranked,matchedText:item.matchedText,downrankedText:item.downrankedText});
async function search(scroll=true){
  for(const kind of WORD_KINDS){state.drafts[kind]=$(kind).value;if((state.drafts[kind].trim()||state.editing[kind]!==null)&&!commitWord(kind))return;}
  const generation=++queryGeneration,query={words:[...state.keywords],lowered:[...state.downrank],selected:[...state.selected].sort(),recruitment:state.recruitment};
  try{
    if(!globalThis.ANDE_DATA)throw new Error('岗位目录加载失败，请刷新页面后再试。');
    updateLoadStatus('正在查询…下面仍是上次结果。');
    const page=await queryPage(query,0);
    if(generation!==queryGeneration)return;
    const openJob=$('detailDialog')?.open?state.focused:null,detailScroll=$('modalDetail')?.scrollTop;
    updateLoadStatus('');state.active=query;state.results=page.items.map(toResult);state.total=page.total;state.matched=page.matched;state.penalized=page.penalized;state.searched=true;state.focused=openJob;
    render();if(openJob&&jobCache.has(openJob)){setDetail(openJob);$('modalDetail').scrollTop=detailScroll;}
    if(scroll)requestAnimationFrame(()=>$('results')?.scrollIntoView({behavior:'auto',block:'start'}));
  }catch(error){if(generation===queryGeneration)updateLoadStatus(error.message+' 尚未更新查询结果，可再次点击查找重试。');}
}
function focusCompanies(){$('companySearch').focus();}
async function showJob(id){
  state.focused=id;document.querySelectorAll('[data-job-row]').forEach(row=>row.classList.toggle('active',row.dataset.jobRow===id));
  if(jobCache.has(id)){setDetail(id);$('detailDialog').showModal();return;}
  $('modalDetail').innerHTML='<p class="detail-loading" role="status">正在加载岗位详情…</p>';$('detailApply').innerHTML='';$('detailDialog').showModal();
  try{jobCache.set(id,await fetchJSON('api/job/'+encodeURIComponent(id)));if(state.focused===id)setDetail(id);}
  catch(error){if(state.focused===id)$('modalDetail').innerHTML='<p class="detail-disclaimer">'+esc(error.message)+' 请关闭后重试。</p>';}
}
document.addEventListener('submit',e=>{if(e.target.matches('[data-search-form]')){e.preventDefault();search();}});
document.addEventListener('input',e=>{
  const kind=e.target.dataset.wordInput;if(WORD_KINDS.includes(kind)){state.drafts[kind]=e.target.value;state.feedback[kind]='';updateWordEditor(kind);updateFormStatus();}
  if(e.target.id==='companySearch'){directory.query=e.target.value;directory.letter='';renderDirectory();}
});
document.addEventListener('change',e=>{
  if(e.target.dataset.company){if(e.target.checked)state.selected.add(e.target.dataset.company);else state.selected.delete(e.target.dataset.company);persistPreferences();renderSelection();updateFormStatus();}
});
document.addEventListener('click',e=>{
  const add=e.target.closest('[data-add-word]');if(add){commitWord(add.dataset.addWord);return;}
  const cancel=e.target.closest('[data-cancel-word]');if(cancel){cancelWord(cancel.dataset.cancelWord);return;}
  const edit=e.target.closest('[data-edit-word]');if(edit){editWord(edit.dataset.kind,Number(edit.dataset.editWord));return;}
  const wordRemove=e.target.closest('[data-remove-word]');if(wordRemove){removeWord(wordRemove.dataset.kind,Number(wordRemove.dataset.removeWord));return;}
  const remove=e.target.closest('[data-remove-company]');if(remove){state.selected.delete(remove.dataset.removeCompany);persistPreferences();renderSelection();updateFormStatus();$('companySearch').focus({preventScroll:true});return;}
  const letter=e.target.closest('[data-letter]');if(letter){directory.letter=letter.dataset.letter;directory.query='';$('companySearch').value='';renderDirectory();$('companyOptions').scrollTop=0;return;}
  const recruitment=e.target.closest('[data-recruitment]');if(recruitment){state.recruitment=recruitment.dataset.recruitment;document.querySelectorAll('[data-recruitment]').forEach(button=>button.setAttribute('aria-pressed',button.dataset.recruitment===state.recruitment));persistPreferences();updateFormStatus();return;}
  const job=e.target.closest('[data-job]');if(job){showJob(job.dataset.job);return;}
  const button=e.target.closest('[data-action]');if(!button)return;
  switch(button.dataset.action){
    case 'open-companies':focusCompanies();break;
    case 'clear-settings':clearSettings();break;
    case 'fill-example':fillExample();break;
    case 'close-detail':$('detailDialog').close();break;
  }
});
for(const dialog of document.querySelectorAll('dialog')){dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});}
document.addEventListener('keydown',e=>{
  if(e.isComposing||e.keyCode===229)return;
  const kind=e.target.dataset.wordInput;
  if(WORD_KINDS.includes(kind)){if(e.key==='Enter'){e.preventDefault();commitWord(kind);}else if(e.key==='Escape'){e.preventDefault();cancelWord(kind);}return;}
  if(e.target.id==='companySearch'&&e.key==='Enter')e.preventDefault();
});
restorePreferences();
render();
