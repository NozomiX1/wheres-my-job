// Native checks for the production UI. No crawling or browser dependencies.
// Run: node tests/app.test.cjs
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),script=fs.readFileSync(path.join(root,'assets/app.js'),'utf8');
const examplesScript=fs.readFileSync(path.join(root,'assets/example-words.js'),'utf8');
const dataset=require('../crawler/publish').readPublished(path.join(root,'data/catalog.js'));
const base={id:'unit-base',sourceKey:'unit',company:'字节跳动',city:'北京',title:'',duty:'',requirements:'',description:'',channels:['campus'],employment:'full-time',talentPlan:false,date:'2026-09-10',dateKind:'published',url:'https://example.test/job',jdComplete:true,category:''};
const jobs=[{...base,id:'unit-finance',title:'财务',duty:'财务',requirements:'财务'}, {...base,id:'unit-sales',title:'销售',duty:'销售',requirements:'销售',channels:['social']}, {...base,id:'unit-unknown',description:'PYTHON 完整未分段正文',channels:[],employment:null,talentPlan:null,date:null,dateKind:null,jdComplete:false}];
function load(saved,inputJobs=jobs,inputParts){
 const storage=new Map(),elements=new Map();let writes=0;
 if(saved!==undefined)storage.set('ande.preferences.v1',JSON.stringify(saved));
 const element=key=>{if(!elements.has(key))elements.set(key,{value:'',innerHTML:'',textContent:'',hidden:false,setAttribute(){},focus(){},select(){}});return elements.get(key);};
 const ctx=vm.createContext({URL,ANDE_DATA:{...dataset,jobs:inputJobs,...(inputParts?{parts:inputParts}:{})},document:{addEventListener(){},querySelectorAll(){return []},getElementById:element,querySelector:element},localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>{writes++;storage.set(k,v);}}});
 vm.runInContext(examplesScript,ctx);
 vm.runInContext(script.replace(/\nrestorePreferences\(\);\nrender\(\);\s*$/,'')+'\nglobalThis.api={score,scoreText,collect,fillExample,restorePreferences,persistPreferences,matchesRecruitment,recruitmentLabels,wordEditor,reliableDate,dateHTML,applyHTML,detailHTML,rowHTML,hitText,sourceStatusHTML,jdNotice,unitName,COMPANIES,renderDirectory,renderSelection,companyEditor,footer,state,JOBS,EXAMPLE_KEYWORDS,EXAMPLE_DOWNRANK,RECRUITMENT_TYPES,message:()=>preferencesMessage};',ctx);
 return {...ctx.api,storage,element,writes:()=>writes};
}
const p=load(),close=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`),query={words:['财务'],lowered:[],recruitment:'all'};
// Missing detail is not evidence that the employer supplied a blank JD.
assert.equal(p.jdNotice({...base,sourceKey:'meituan_social',jdComplete:false,duty:'列表中已取得的职责'}),'正文完整性尚未核验');
assert.equal(p.jdNotice({...base,sourceKey:'meituan_social',jdComplete:false}),'本站尚未同步完整 JD');
new vm.Script(script);
for(const [field,points]of [['title',3],['duty',1],['requirements',.35]]){
 const j={...base,[field]:'财务 财务 财务'};
 close(p.score(j,query).value,points);
 close(p.score(j,{words:[],lowered:['财务']}).value,-points);
}
close(p.score(jobs[0],query).value,4.35);
// Literal display frequency is not a score multiplier or a new tie-breaker.
const counted={...base,id:'unit-counts',title:'Agent AGENT',duty:'agent Agent C++',requirements:'AGENT World Model world model C++',description:'Agent '.repeat(20),category:'Agent'};
assert.equal(p.hitText(counted,'Agent'),'Agent × 5');assert.equal(p.hitText(counted,'C++'),'C++ × 2');assert.equal(p.hitText(counted,'World Model'),'World Model × 2');assert.equal(p.hitText({...base,title:'one'},'one'),'one');
assert.equal(p.hitText({...base,title:'aaaaa'},'aa'),'aa × 2');assert.equal(p.hitText({...base,title:'Agentic Agent'},'Agent'),'Agent × 2');assert.equal(p.hitText({...base,title:'Agentic Agent'},'Agentic'),'Agentic');
assert.equal(p.hitText({...base,title:'C++',requirements:'C++'},'C++'),'C++ × 2');assert.equal(p.hitText({...base,description:'AGENT Agent'},'Agent'),'Agent × 2');assert.equal(p.hitText({...base,title:'Wor',duty:'ld Model'},'World Model'),'World Model');
const frequent=p.score(counted,{words:['Agent'],lowered:['agent']});assert.equal(frequent.positive,4.35);assert.equal(frequent.penalty,4.35);assert.equal(frequent.value,0);
assert.equal(p.score({...counted,category:'销售 财务'},query).value,0);assert.equal(p.score({...base,title:'one',category:'财务'},query).value,0);
p.state.active={words:['Agent'],lowered:['agent']};const countedRow=p.rowHTML(frequent);assert.equal((countedRow.match(/Agent × 5/g)||[]).length,1);assert.equal((countedRow.match(/agent × 5/g)||[]).length,1);
const inDetail=load(undefined,[counted]);inDetail.state.active={words:['Agent'],lowered:['agent']};const detailCounts=inDetail.detailHTML(counted.id);assert.ok(detailCounts.includes('优先 · Agent × 5'));assert.ok(detailCounts.includes('降权 · agent × 5'));
// A real full renderer body may coexist with separately proven scoring fields.
// Display the full body once; its extra sections are not a fourth matching field.
const fullBody={...base,id:'unit-full-body',duty:'同文职责 Agent',requirements:'同文职责 Agent',description:'部门介绍\n额外团队\n\n岗位职责\n同文职责 Agent\n\n岗位基本要求\n同文职责 Agent\n\n岗位亮点\nList<T> &amp; '+ '长正文 '.repeat(900)+'真实尾部'};
const fullUI=load(undefined,[fullBody]);fullUI.state.active={words:[],lowered:[]};const fullMarkup=fullUI.detailHTML(fullBody.id);
assert.ok(fullMarkup.includes('<h3>岗位正文</h3>'));assert.ok(!fullMarkup.includes('<h3>工作职责</h3>')&&!fullMarkup.includes('<h3>任职要求</h3>'));assert.equal((fullMarkup.match(/同文职责 Agent/g)||[]).length,2);assert.ok(fullMarkup.includes('额外团队')&&fullMarkup.includes('List&lt;T&gt; &amp;amp;')&&fullMarkup.includes('真实尾部'));
assert.equal(fullUI.score(fullBody,{words:['Agent']}).value,1.35);assert.equal(fullUI.hitText(fullBody,'Agent'),'Agent × 2');assert.equal(fullUI.score(fullBody,{words:['额外团队']}).value,0);
const fallbackBody={...fullBody,duty:''};assert.equal(fullUI.score(fallbackBody,{words:['Agent']}).value,1.35);assert.equal(fullUI.hitText(fallbackBody,'Agent'),'Agent × 3');assert.equal(fullUI.score(fallbackBody,{words:['额外团队']}).value,1);assert.equal(fullUI.score(fallbackBody,{words:['Agent'],lowered:['agent']}).value,0);
// Full external JD and previously acquired independent list text can differ; neither may be hidden.
const supplementalBody={...base,id:'unit-supplemental-body',duty:'原列表职责 <T> &amp;',requirements:'独立要求原文',description:'新取得官网完整正文\n真实尾部'};
const supplementalUI=load(undefined,[supplementalBody]);supplementalUI.state.active={words:[],lowered:[]};const supplementalMarkup=supplementalUI.detailHTML(supplementalBody.id);
assert.ok(supplementalMarkup.includes('新取得官网完整正文\n真实尾部'));assert.ok(supplementalMarkup.includes('原列表职责 &lt;T&gt; &amp;amp;'));assert.ok(supplementalMarkup.includes('独立要求原文'));
assert.ok(supplementalMarkup.includes('<h3>工作职责</h3>')&&supplementalMarkup.includes('<h3>任职要求</h3>'));assert.equal(supplementalUI.score(supplementalBody,{words:['新取得']}).value,0);
const sameIndependent={...supplementalBody,duty:'两个独立同文栏',requirements:'两个独立同文栏'},sameIndependentUI=load(undefined,[sameIndependent]);sameIndependentUI.state.active={words:[],lowered:[]};assert.equal((sameIndependentUI.detailHTML(sameIndependent.id).match(/两个独立同文栏/g)||[]).length,2);
const categoryJob={...base,id:'unit-category',title:'相同标题',category:'后端'},withCategory=load(undefined,[categoryJob]);withCategory.state.active={words:[],lowered:[]};const categoryRow=withCategory.rowHTML(withCategory.score(categoryJob,{words:[]}));assert.ok(categoryRow.includes('<span>字节跳动</span><span>·</span><span class="job-category">后端</span><span>·</span>'));assert.ok(withCategory.detailHTML(categoryJob.id).includes('字节跳动 · 后端 · 北京'));
assert.ok(!withCategory.rowHTML(withCategory.score({...categoryJob,category:''},{words:[]})).includes('job-category'));
const hostileCategory='<img src=x onerror="globalThis.pwned=1">';const escaped=withCategory.rowHTML(withCategory.score({...categoryJob,category:hostileCategory},{words:[]}));assert.ok(escaped.includes('&lt;img'));assert.ok(!escaped.includes('<img'));
const paused={...base,id:'unit-paused',title:'相同标题',sourceStatus:'pause'},statusUI=load(undefined,[paused]);statusUI.state.active={words:[],lowered:[]};
assert.ok(statusUI.rowHTML(statusUI.score(paused,{words:[]})).includes('官网接口状态：pause'));assert.ok(statusUI.detailHTML(paused.id).includes('实际招聘及投递可用性请以官网为准'));assert.ok(!statusUI.applyHTML(paused).includes('disabled'));assert.equal(statusUI.collect({words:[]},new Set()).length,1);
assert.equal(statusUI.sourceStatusHTML({...paused,sourceStatus:'open'}),'');assert.equal(statusUI.sourceStatusHTML({...paused,sourceStatus:null}),'');assert.ok(statusUI.sourceStatusHTML({...paused,sourceStatus:hostileCategory}).includes('&lt;img'));assert.ok(!statusUI.sourceStatusHTML({...paused,sourceStatus:hostileCategory}).includes('<img'));
assert.equal(statusUI.score({...paused,sourceStatus:'财务'},query).value,0);assert.equal(statusUI.hitText({...paused,sourceStatus:'Agent Agent'},'Agent'),'Agent');
for(const description of ['-', '。', '/']){const placeholder=load(undefined,[{...base,id:'placeholder',description,jdComplete:false}]);placeholder.state.active={words:[],lowered:[]};assert.ok(placeholder.detailHTML('placeholder').includes('仅有占位描述'));}
for(const sourceKey of ['meituan_social','mihoyo','mihoyo_social']){const emptyNative={...base,id:sourceKey+':symbol',sourceKey,description:'部门介绍\n---',jdComplete:false},placeholder=load(undefined,[emptyNative]);placeholder.state.active={words:[],lowered:[]};assert.equal(placeholder.jdNotice(emptyNative),'官网当前提供的正文为空白或占位描述');const markup=placeholder.detailHTML(emptyNative.id);assert.ok(markup.includes('部门介绍\n---'));assert.ok(markup.includes('官网当前提供的正文为空白或占位描述'));assert.ok(!markup.includes('正文完整性尚未核验'));}
const ties=load(undefined,[{...base,id:'tie-a',title:'Agent'},{...base,id:'tie-b',title:'Agent '.repeat(9),category:'热门'}]);assert.deepEqual([...ties.collect({words:['Agent']},new Set()).map(r=>r.job.id)],['tie-a','tie-b']);
close(p.score(jobs[2],{words:['python']}).value,1);
close(p.score({...base,title:'Agent RAG 销售'},{words:['Agent','RAG'],lowered:['销售']}).value,3);
const cancelled=p.score({...base,title:'AGENT',duty:'Agent',requirements:'agent'},{words:['Agent'],lowered:['agent']});
assert.equal(cancelled.value,0);assert.ok(!Object.is(cancelled.value,-0));
for(const word of ['Agent','算法','财务','推理框架'])close(p.score({...base,title:word},{words:[word]}).value,3);
p.state.active={words:[],lowered:[]};assert.equal(p.scoreText(0),'—');
p.state.active={words:[],lowered:['销售']};assert.equal(p.scoreText(-.35),'-0.35');assert.equal(p.scoreText(0),'0.00');assert.equal(p.scoreText(108.75),'108.75');
for(const [kind,hint]of [['keywords','填写想优先看的方向、技能或工作内容，命中会加分。'],['downrank','填写不太想看的方向或工作内容，命中会扣分。']]){
 const markup=p.wordEditor(kind);assert.ok(markup.includes(`<p class="word-hint" id="${kind}Hint">${hint}</p>`));assert.ok(markup.includes(`aria-describedby="${kind}Hint ${kind}Feedback"`));
}
for(const [words,count]of [[p.EXAMPLE_KEYWORDS,85],[p.EXAMPLE_DOWNRANK,37]]){assert.equal(words.length,count);assert.equal(new Set(words.map(w=>w.toLowerCase())).size,count);assert.ok(words.every(w=>w.trim()===w&&!/[\\|?()]/.test(w)));}
assert.ok(p.EXAMPLE_KEYWORDS.includes('World Model'));assert.ok(p.EXAMPLE_DOWNRANK.includes('测试'));
const example=load();assert.equal(example.state.keywords.length,0);assert.equal(example.state.downrank.length,0);
example.state.keywords=['财务','agent'];example.state.downrank=['RAG','销售'];example.state.drafts={keywords:'未添加',downrank:'保留草稿'};example.state.editing={keywords:0,downrank:1};example.state.selected.add('字节跳动');example.state.recruitment='campus';example.state.active={words:['财务'],lowered:['RAG'],selected:['字节跳动'],recruitment:'campus'};example.state.searched=true;
const active=example.state.active,results=example.state.results;
example.fillExample();assert.equal(example.writes(),1);const once=JSON.stringify([example.state.keywords,example.state.downrank]);example.fillExample();assert.equal(example.writes(),2);assert.equal(JSON.stringify([example.state.keywords,example.state.downrank]),once);
assert.equal(example.state.keywords.length,86);assert.equal(example.state.downrank.length,38);assert.deepEqual([...example.state.keywords].slice(0,2),['财务','agent']);assert.equal(example.state.drafts.keywords,'未添加');assert.equal(example.state.drafts.downrank,'保留草稿');assert.equal(example.state.editing.keywords,0);assert.equal(example.state.editing.downrank,1);assert.equal(example.state.recruitment,'campus');assert.strictEqual(example.state.active,active);assert.strictEqual(example.state.results,results);assert.ok(example.state.feedback.keywords.includes('相抵'));
const saved=JSON.parse(example.storage.get('ande.preferences.v1'));assert.deepEqual(saved.downrank,[...example.state.downrank]);assert.ok(!('drafts'in saved));
const types=Array.from(p.RECRUITMENT_TYPES,([type])=>type),scopes=j=>types.filter(t=>p.matchesRecruitment(j,t));
assert.deepEqual(scopes({channels:[],employment:null,talentPlan:null}),types);
assert.deepEqual(scopes({channels:['campus'],employment:'full-time',talentPlan:true}),['all','campus','talent']);
assert.deepEqual(scopes({channels:['social'],employment:'internship',talentPlan:false}),['all','social','internship']);
// Unknown hints describe only the missing channel/nature, not an unknown talent flag.
const labelCases=[
 [{channels:['campus'],employment:'internship',talentPlan:null},['校招','实习'],['all','campus','internship','talent']],
 [{channels:['social'],employment:'full-time',talentPlan:null},['社招','全职'],['all','social','talent']],
 [{channels:[],employment:'full-time',talentPlan:null},['全职','渠道未明确'],['all','social','campus','talent']],
 [{channels:['campus'],employment:null,talentPlan:null},['校招','性质未明确'],['all','campus','internship','talent']],
 [{channels:[],employment:null,talentPlan:null},['渠道未明确','性质未明确'],types],
 [{channels:['campus'],employment:'full-time',talentPlan:true},['校招','全职','人才计划'],['all','campus','talent']],
 [{channels:[],employment:null,talentPlan:true},['人才计划','渠道未明确','性质未明确'],types],
 [{channels:['campus'],employment:'full-time',talentPlan:undefined},['校招','全职'],['all','campus','talent']],
 [{channels:['social'],employment:'internship',talentPlan:false},['社招','实习'],['all','social','internship']],
 [{channels:['campus','social'],employment:'full-time',talentPlan:false},['校招','社招','全职'],['all','social','campus']],
 [{channels:undefined,employment:undefined,talentPlan:undefined},['渠道未明确','性质未明确'],types]
];
for(const [attributes,labels,expectedScopes]of labelCases){
 const job={...base,...attributes,title:'财务',duty:'财务',requirements:'财务'},before=JSON.stringify(job),ui=load(undefined,[job]);ui.state.active={words:['财务'],lowered:[]};
 assert.deepEqual([...ui.recruitmentLabels(job)],labels);assert.deepEqual(scopes(job),expectedScopes);
 const row=ui.rowHTML(ui.score(job,query)),detail=ui.detailHTML(job.id);
 for(const label of labels){assert.ok(row.includes(`<span class="job-track">${label}</span>`));assert.ok(detail.includes(label));}
 for(const label of ['类型未明确','渠道未明确','性质未明确','人才计划'])if(!labels.includes(label)){assert.ok(!row.includes(label));assert.ok(!detail.includes(label));}
 close(ui.score(job,query).value,4.35);assert.equal(JSON.stringify(job),before);
}
for(const recruitment of types){const before=p.collect({...query,recruitment},new Set()),after=p.collect({...query,recruitment,lowered:['财务','销售','python']},new Set());assert.deepEqual([...after.map(r=>r.job.id)].sort(),[...before.map(r=>r.job.id)].sort());assert.ok(after.every((r,i)=>!i||after[i-1].value>=r.value));assert.equal(new Set(after.map(r=>r.job.id)).size,after.length);}
assert.equal(p.collect(query,new Set(['字节跳动'])).length,3);
assert.equal(p.collect(query,new Set(['未知公司'])).length,0);
const lowerOnly=p.collect({words:[],lowered:['销售']},new Set());assert.equal(lowerOnly.length,3);assert.equal(lowerOnly.at(-1).value,-4.35);
const dated=load(undefined,[{...base,id:'date-old',date:'2026-01-01'},{...base,id:'unknown',date:'2099-01-01',dateKind:null},{...base,id:'date-new',date:'2026-09-10',dateKind:'updated'},{...base,id:'invalid',date:'2026-02-30'}]);
assert.deepEqual([...dated.collect({words:[]},new Set()).map(r=>r.job.id)],['date-new','date-old','invalid','unknown']);assert.equal(dated.reliableDate({...base,date:'2026-02-30'}),'');assert.ok(dated.dateHTML({...base,dateKind:null}).includes('未明确'));
assert.ok(p.applyHTML({...base,url:'javascript:alert(1)'}).includes('disabled'));assert.ok(p.applyHTML({...base,url:'https://user:pass@example.test/'}).includes('disabled'));assert.ok(p.applyHTML(base).includes('rel="noopener noreferrer"'));
p.state.active={words:[],lowered:[]};const hostile=p.rowHTML({job:{...base,id:'\" onclick=\"alert(1)'},value:0,matched:[],downranked:[]});assert.ok(hostile.includes('data-job-row="&quot; onclick=&quot;alert(1)"'));assert.ok(!hostile.includes('" onclick="'));
assert.ok(p.detailHTML('unit-unknown').includes('正文完整性尚未核验'));assert.ok(!p.detailHTML('unit-unknown').includes('虚构'));assert.ok(p.detailHTML('unit-unknown').includes('前往官网'));
const prefs={version:1,keywords:[' 财务 ','财务'],downrank:['销售'],selected:['字节跳动'],recruitment:'social'},restored=load(prefs);restored.restorePreferences();assert.deepEqual([...restored.state.keywords],['财务']);assert.equal(restored.state.recruitment,'social');assert.equal(restored.state.active,null);assert.equal(restored.state.searched,false);
const invalid=load({...prefs,recruitment:'bad'});invalid.restorePreferences();assert.ok(invalid.message());
// Validate the current published schema, not a permanently frozen legacy record count.
// Initial HTML records were explicitly retired; official blank/unknown facts still remain.
assert.equal(dataset.version,1);assert.equal(new Set(dataset.jobs.map(j=>j.id)).size,dataset.jobs.length);assert.ok(dataset.jobs.every(j=>!j.id.startsWith('sample-')&&(j.category===undefined||typeof j.category==='string')&&(j.sourceStatus==null||typeof j.sourceStatus==='string')&&!('score'in j)&&!('titleTier'in j)));assert.ok(dataset.sources.every(s=>s.lastSuccess===null||typeof s.lastSuccess==='string'));
const live=load(undefined,dataset.jobs);assert.equal(live.collect({words:['财务'],lowered:['销售','算法']},new Set()).length,dataset.jobs.length);
// Flat units keep source identity; initial HTML data and its pending directory bucket are gone.
const datasetBefore=JSON.stringify(dataset),holding='阿里巴巴控股',pending='阿里招聘（部门待核）',retired='旧阿里招聘范围（已退出）',allQuery={words:[],lowered:[],recruitment:'all'};
assert.equal(dataset.legacy,undefined);assert.ok(dataset.jobs.every(j=>!j.id.startsWith('legacy-')));
const expectedUnits=new Set(dataset.companies.map(c=>c.name==='阿里巴巴'?holding:c.name));for(const j of dataset.jobs)if(j.sourceKey==='alibaba')for(const name of dataset.unitMemberships?.[j.id]||['阿里校园招聘入口'])expectedUnits.add(({'阿里巴巴控股集团':holding,'阿里国际数字商业集团':'阿里国际'})[name]||name);assert.equal(live.COMPANIES.length,expectedUnits.size);assert.ok(!live.COMPANIES.some(c=>c.name==='阿里巴巴'||c.name===pending||c.name===retired));
assert.ok(live.COMPANIES.some(c=>c.name===holding&&c.initial==='A'));assert.ok(live.COMPANIES.some(c=>c.name==='淘天集团'));
assert.equal(live.unitName({company:'阿里巴巴',sourceKey:'alibaba_social'}),holding);assert.equal(live.unitName({company:'阿里巴巴',key:'alibaba_social'}),holding);assert.equal(live.unitName({company:'阿里巴巴',sourceKey:'alibaba'}),'阿里校园招聘入口');
assert.equal(live.unitName({company:'阿里巴巴',sourceKey:'future_unknown'}),'阿里巴巴');assert.equal(live.unitName({company:'其它公司',sourceKey:'alibaba_social'}),'其它公司');
const bySource=key=>dataset.jobs.filter(j=>j.sourceKey===key),holdingJobs=dataset.jobs.filter(j=>j.sourceKey==='alibaba_social'||dataset.unitMemberships?.[j.id]?.includes('阿里巴巴控股集团')),ids=rows=>Array.from(rows,r=>r.job.id).sort();
assert.deepEqual(ids(live.collect(allQuery,new Set([holding]))),holdingJobs.map(j=>j.id).sort());assert.equal(live.collect(allQuery,new Set([pending])).length,0);assert.equal(live.collect(allQuery,new Set([retired])).length,0);
assert.equal(live.collect(allQuery,new Set()).length,dataset.jobs.length);assert.equal(live.collect({words:[],lowered:['AI','算法']},new Set([holding])).length,holdingJobs.length);
live.state.active=allQuery;for(const job of holdingJobs.filter(j=>j.sourceKey==='alibaba_social').slice(0,1)){const row=live.rowHTML(live.score(job,allQuery)),detail=live.detailHTML(job.id);assert.ok(row.includes('<span>'+holding+'</span>'));assert.ok(detail.includes('<p>'+holding));assert.ok(!row.includes('<span>阿里巴巴</span>'));assert.deepEqual(Array.from(live.recruitmentLabels(job)),Array.from(p.recruitmentLabels(job)));assert.equal(live.score(job,{words:[holding],lowered:[]}).value,p.score(job,{words:[holding],lowered:[]}).value);}
live.renderDirectory();const directoryMarkup=live.element('companyOptions').innerHTML;assert.ok(directoryMarkup.includes('data-company="'+holding+'"'));assert.ok(!directoryMarkup.includes('data-company="'+pending+'"')&&!directoryMarkup.includes('data-company="阿里巴巴"'));assert.ok(new RegExp(holdingJobs.length+' 个岗位 · \\d\\d-\\d\\d 更新</span>').test(directoryMarkup));// Availability wording is exercised with an empty fixture, not an accidental zero-data live unit.
const realSources=dataset.sources;dataset.sources=realSources.map(s=>({...s,status:'unavailable'}));const emptyDirectoryUI=load(undefined,[]);dataset.sources=realSources;emptyDirectoryUI.renderDirectory();assert.ok(emptyDirectoryUI.element('companyOptions').innerHTML.includes('暂无数据'));
// 空单位只写 0 个岗位，不暗示没有招聘。
const emptyAvailableUI=load(undefined,[]);emptyAvailableUI.renderDirectory();assert.ok(emptyAvailableUI.element('companyOptions').innerHTML.includes('0 个岗位'));assert.ok(!emptyAvailableUI.element('companyOptions').innerHTML.includes('覆盖待完善'));
assert.ok(live.companyEditor().includes('招聘单位'));assert.match(live.footer(),/数据最近更新：\d{4}-\d\d-\d\d。/);assert.ok(!live.footer().includes('alibaba_social')&&!live.footer().includes('来源及更新状态'));
const oldUnitPrefs={version:1,keywords:['财务'],downrank:['销售'],selected:['阿里巴巴','淘天集团',holding],recruitment:'social'},migrated=load(oldUnitPrefs,dataset.jobs);migrated.restorePreferences();assert.deepEqual([...migrated.state.selected],[holding,'淘天集团']);assert.equal(migrated.writes(),0);assert.deepEqual(JSON.parse(migrated.storage.get('ande.preferences.v1')),oldUnitPrefs);assert.equal(migrated.state.active,null);assert.equal(migrated.state.searched,false);assert.equal(migrated.state.recruitment,'social');assert.deepEqual([...migrated.state.keywords],['财务']);assert.deepEqual([...migrated.state.downrank],['销售']);migrated.persistPreferences();assert.deepEqual(JSON.parse(migrated.storage.get('ande.preferences.v1')).selected,[holding,'淘天集团']);
const sameUnitReload=load(JSON.parse(migrated.storage.get('ande.preferences.v1')),dataset.jobs);sameUnitReload.restorePreferences();assert.deepEqual([...sameUnitReload.state.selected],[holding,'淘天集团']);assert.equal(sameUnitReload.state.active,null);
for(const selected of [[pending],[retired],['已退出的未知单位'],[pending,'淘天集团'],['已退出的未知单位','淘天集团'],[]]){const q=load({...oldUnitPrefs,selected},dataset.jobs);q.restorePreferences();assert.equal(q.state.active,null);assert.equal(q.writes(),0);if(selected.length){assert.ok(q.state.selected.has(selected.some(n=>n===pending||n===retired)?retired:'已退出的未知单位'));assert.ok(q.message().includes('已退出'));assert.equal(q.collect(allQuery,q.state.selected).length,selected.includes('淘天集团')?dataset.jobs.filter(j=>j.company==='淘天集团'||dataset.unitMemberships?.[j.id]?.includes('淘天集团')).length:0);q.persistPreferences();const reload=load(JSON.parse(q.storage.get('ande.preferences.v1')),dataset.jobs);reload.restorePreferences();assert.deepEqual([...reload.state.selected],[...q.state.selected]);}else{assert.equal(q.state.selected.size,0);assert.equal(q.collect(allQuery,q.state.selected).length,dataset.jobs.length);}}
const everyResult=live.collect(allQuery,new Set());for(let i=1;i<everyResult.length;i++){const prev=everyResult[i-1].job,next=everyResult[i].job;if(live.reliableDate(prev)===live.reliableDate(next))assert.ok(live.unitName(prev).localeCompare(live.unitName(next),'zh')<0||live.unitName(prev)===live.unitName(next)&&prev.id.localeCompare(next.id)<=0);}
assert.equal(JSON.stringify(dataset),datasetBefore);assert.strictEqual(live.JOBS,dataset.jobs);
// A populated shared campus portal must be selectable without broadening an old holding-only preference.
const campusName='阿里校园招聘入口',campusJob={...base,id:'alibaba:campus-unit',sourceKey:'alibaba',company:'阿里巴巴',title:'校园原岗位'},holdingJob={...base,id:'alibaba_social:holding-unit',sourceKey:'alibaba_social',company:'阿里巴巴',title:'控股原岗位'};
const campusUI=load({...oldUnitPrefs,selected:['阿里巴巴']},[campusJob,holdingJob]);assert.ok(campusUI.COMPANIES.some(c=>c.name===campusName));assert.deepEqual(ids(campusUI.collect(allQuery,new Set([campusName]))),[campusJob.id]);campusUI.restorePreferences();assert.deepEqual([...campusUI.state.selected],[holding]);assert.deepEqual(ids(campusUI.collect(allQuery,campusUI.state.selected)),[holdingJob.id]);assert.equal(campusUI.state.searched,false);assert.equal(campusUI.writes(),0);
const campusCatalog=load(undefined,[],[{sourceKey:'alibaba',company:'阿里巴巴',count:1},{sourceKey:'alibaba_social',company:'阿里巴巴',count:1}]);assert.ok(campusCatalog.COMPANIES.some(c=>c.name===campusName));campusCatalog.renderDirectory();assert.ok(campusCatalog.element('companyOptions').innerHTML.includes('data-company="'+campusName+'"'));assert.equal(campusCatalog.JOBS.length,0);
const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),css=fs.readFileSync(path.join(root,'assets/style.css'),'utf8');assert.ok(!html.includes('prototype')&&!script.includes('虚构')&&!script.includes('updateDebug'));assert.ok(!css.includes('claude')&&!css.includes('workspace')&&!css.includes('height:82px'));assert.ok(css.includes('.word-list:empty{display:none}'));
console.log('PASS: native UI scoring, full examples, preference/query boundary, per-word counts (not multipliers), display-only official categories/status, placeholder honesty, factual types/dates/links, published-data invariants and no prototype/old algorithm dependencies.');
