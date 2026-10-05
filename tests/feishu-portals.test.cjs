// Reviewed SaaS portals reuse the strict full-scan pipeline; no network or Chrome.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const feishu = require('../crawler/lib/feishu');
const { adapterCommand, runCrawl } = require('../crawler/crawl');
const { normalizeJobs, readPublished, publish } = require('../crawler/publish');
const PROFILES = [
  ['sensetime', '商汤', 'https://hr-jobs.sensetime.com/edu', 'edu'],
  ['sensetime_social', '商汤', 'https://hr-jobs.sensetime.com/exp', 'exp'],
  ['minimax', 'MiniMax', 'https://vrfi1sk8a0.jobs.feishu.cn/379481/', '379481'],
  ['minimax_social', 'MiniMax', 'https://vrfi1sk8a0.jobs.feishu.cn/index', 'index'],
  ['lilith', '莉莉丝', 'https://lilithgames.jobs.feishu.cn/campus', 'campus', ['campus','intern']],
  ['lilith_social', '莉莉丝', 'https://lilithgames.jobs.feishu.cn/career/', 'career', ['career','index']],
  ['papegames', '叠纸游戏', 'https://career.papegames.com/campus/position/list', 'campus'],
  ['papegames_social', '叠纸游戏', 'https://career.papegames.com/social/position/list', 'social']
].map(([key,company,url,websitePath,portalPaths]) => ({ key,company,ats:'feishu',adapter:'feishu-portal-v1',url,websitePath,portalType:6,subjectIdList:[],...(portalPaths?{portalPaths}:{}),linkTemplate:new URL(url).origin+'/'+websitePath+'/position/{id}/detail',...(key.endsWith('_social')?{track:'social'}:{}) }));
const rawPost = (id='a') => ({ id,title:'商务运营实习生-深圳',description:'全部职责\n保留 List<T> &amp; 以及末尾。',requirement:'全部要求',city_list:[{name:'深圳'}],recruit_type:{name:'实习',parent:{name:'校招'}},job_category:{name:'商业运营'} });
const response = jobs => ({ status:200,body:{code:0,data:{count:jobs.length,job_post_list:jobs}} });

test('only individually reviewed exact SaaS profiles are production eligible', () => {
  for (const site of PROFILES) {
    assert.equal(feishu.verifiedSource(site),true,site.key);
    assert.equal(path.basename(adapterCommand(site,'unused').script),'feishu.js');
    for (const change of [{key:'unreviewed'},{company:'其它公司'},{ats:'custom'},{adapter:undefined},{portalType:2},{websitePath:'other'},{subjectIdList:['old-project']},{url:site.url+'?keyword=AI'},{linkTemplate:'https://wrong.example/{id}'},{categoryRootIds:[]},{categoryGroups:[]},{categoryTreeHash:'forged'}]) assert.equal(feishu.verifiedSource({...site,...change}),false,site.key+':'+JSON.stringify(change));
    assert.equal(feishu.verifiedSource({...site,portalPaths:['unreviewed']}),false);
    const body=feishu.requestBody({...site,matchKeyword:'AI|算法',exclude:'无限原力',batch:'2027届'});
    assert.equal(body.portal_type,6);assert.equal(body.keyword,'');
    for (const k of ['subject_id_list','job_category_id_list','recruitment_id_list','job_function_id_list','location_code_list','tag_id_list','storefront_id_list'])assert.deepEqual(body[k],[]);
  }
});

test('actual named job_function is retained when the industry job_category is null', () => {
  const site=PROFILES[0],raw={...rawPost(),job_category:null,job_function:{id:'official',name:' 美术 '}};
  const j=feishu.normalizePost(raw,site);
  assert.equal(j.category,'美术');assert.equal(j.duty,raw.description);
  assert.deepEqual(j.channels,['campus']);assert.equal(j.employment,'internship');assert.equal(j.date,null);assert.equal(j.talentPlan,null);
  assert.throws(()=>feishu.normalizePost({...raw,job_function:{name:2}},site));
});

test('SaaS uses the same two full scans and preserves nontechnical/equal-title opportunities', async () => {
  for(const site of PROFILES.filter(s=>!s.portalPaths)){const raw=[rawPost('first'),rawPost('second')],calls=[];const r=await feishu.fetchAll(site,{request:async b=>{calls.push(b);return response(raw);},sleepImpl:async()=>{}});assert.equal(r.complete,true);assert.equal(r.total,2);assert.equal(calls.length,2);assert.deepEqual(r.jobs.map(j=>j.id),['first','second']);assert.equal(normalizeJobs(r.jobs,site).length,2);assert.equal(r.jobs[0].requirements,'全部要求');}
});

test('registry profiles promoted through the normal crawl/publish writer replace only selected legacy source', t => {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ande-saas-test-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const site=PROFILES[0],other={key:'keep',company:'保留公司',ats:'custom'},dataFile=path.join(dir,'jobs.js');
  const legacy=(s,id)=>({...normalizeJobs([{id,title:'历史岗位'}],{...s,ats:'custom'})[0],jdComplete:false});
  const base={version:1,legacy:true,notices:[],companies:[{name:site.company,initial:'#',aliases:[]},{name:other.company,initial:'#',aliases:[]}],sources:[site,other].map(s=>({key:s.key,company:s.company,status:'legacy',lastSuccess:null,lastAttempt:null,message:'历史',coverage:'历史范围'})),jobs:[legacy(site,'old'),legacy(other,'keep')]};
  // Verified sources require rawPost; a legacy baseline is read as plain schema-1, not normalized through a new adapter.
  base.jobs[0]={...base.jobs[1],id:'legacy-old',sourceKey:site.key,company:site.company};
  fs.writeFileSync(dataFile,'globalThis.ANDE_DATA = '+JSON.stringify(base)+';\n');
  const raw=rawPost(),job={...feishu.normalizePost(raw,site),rawPost:raw};let tick=0;
  const result=runCrawl(site,{outDir:dir,now:()=>tick++?'2026-10-05T08:00:01.000Z':'2026-10-05T08:00:00.000Z',runner:(cmd,args)=>{fs.writeFileSync(args.at(-1),JSON.stringify({complete:true,total:1,jobs:[job]}));return {status:0};}});
  assert.equal(result.code,0);const p=publish({outDir:dir,dataFile,sites:[site,other],keys:[site.key]});assert.equal(p.code,0);assert.deepEqual(p.updated,[site.key]);assert.deepEqual(p.data.jobs.filter(j=>j.sourceKey===other.key),base.jobs.filter(j=>j.sourceKey===other.key));assert.deepEqual(p.data.sources.find(s=>s.key===other.key),base.sources[1]);assert.equal(p.data.jobs.filter(j=>j.sourceKey===site.key).length,1);
  assert.deepEqual(p.data.companies,base.companies);assert.equal(readPublished(dataFile).jobs.length,2);
});

test('failed SaaS run preserves raw/snapshot/public baseline and forged JD facts cannot publish', t => {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ande-saas-fail-test-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));const site=PROFILES[0];
  for(const kind of ['raw','snapshot'])fs.writeFileSync(path.join(dir,site.key+'_'+kind+'.json'),'OLD '+kind+'\n');
  const raw=rawPost(),job={...feishu.normalizePost(raw,site),rawPost:raw,requirements:'tampered'};
  const r=runCrawl(site,{outDir:dir,runner:(cmd,args)=>{fs.writeFileSync(args.at(-1),JSON.stringify({complete:true,total:1,jobs:[job]}));return {status:0};}});assert.equal(r.code,1);for(const kind of ['raw','snapshot'])assert.equal(fs.readFileSync(path.join(dir,site.key+'_'+kind+'.json'),'utf8'),'OLD '+kind+'\n');
  const status=JSON.parse(fs.readFileSync(path.join(dir,site.key+'_status.json')));assert.notEqual(status.status,'ready');
  assert.throws(()=>normalizeJobs([job],site),/raw post/);
});

test('every initial response must succeed before a scan, including second-request business/HTTP failure', () => {
  const good=response([rawPost()]);
  for(const bad of [{...good,status:403},{...good,status:405},{...good,body:{code:1,data:good.body.data}},{...good,body:{...good.body,success:false}},{status:200},{}]){
    let scans=0;const observed=[good,bad];
    assert.throws(()=>{feishu.validateInitialResponses(observed);scans++;});assert.equal(scans,0);
  }
  assert.throws(()=>feishu.validateInitialResponses([]));
  feishu.validateInitialResponses([good,good]);
});

const portalRecord=(scope,id,fields={})=>{const raw={...rawPost(id),...fields};return {...feishu.normalizePost(raw,scope),rawPost:raw};};
const collection=jobs=>({complete:true,total:jobs.length,jobs});
test('declared campus/intern union keeps disjoint postings and their true original URLs/channels', async()=>{
  const site=PROFILES.find(s=>s.key==='lilith'),visited=[];
  const r=await feishu.fetchPortals(site,{collect:async scope=>{visited.push(scope.websitePath);return collection([portalRecord(scope,scope.websitePath)]);}});
  assert.deepEqual(visited,['campus','intern']);assert.equal(r.total,2);assert.deepEqual(r.portals.map(p=>p.total),[1,1]);
  const jobs=normalizeJobs(r.jobs,site);assert.ok(jobs[1].url.includes('/intern/position/'));assert.deepEqual(jobs[1].channels,['campus']);assert.equal(jobs[1].employment,'internship');
  assert.ok(feishu.portalNotice(site).includes('独立实习'));
});
test('social union deduplicates only the same official posting with identical facts, prefers career and retains index-only', async()=>{
  const site=PROFILES.find(s=>s.key==='lilith_social');
  const r=await feishu.fetchPortals(site,{collect:async scope=>collection([
    portalRecord(scope,'shared',scope.websitePath==='career'?{job_category:null,job_function:{name:'职能'}}:{job_category:{name:'职业'},job_function:null}),
    portalRecord(scope,scope.websitePath)
  ])});
  assert.equal(r.total,3);const shared=r.jobs.find(j=>j.id==='shared');assert.equal(shared.portalPath,'career');assert.equal(shared.portalPosts.length,2);assert.equal(shared.category,'职能');assert.ok(shared.url.includes('/career/'));
  const jobs=normalizeJobs(r.jobs,site);assert.ok(jobs.find(j=>j.id.endsWith(':index')).url.includes('/index/'));
  assert.equal(jobs.filter(j=>j.title===rawPost().title).length,3,'Equal titles are NOT identity');
});
test('conflicting portal identity/JD, unreviewed paths, incomplete pages or duplicate IDs reject the entire union', async()=>{
  const site=PROFILES.find(s=>s.key==='lilith_social');
  for(const change of [{title:'different'},{description:'changed duty'},{requirement:'changed requirements'},{city_list:[{name:'上海'}]},{recruit_type:{name:'全职',parent:{name:'社招'}}}])await assert.rejects(feishu.fetchPortals(site,{collect:async s=>collection([portalRecord(s,'same',s.websitePath==='index'?change:{})])}));
  for(const bad of [{complete:false,total:0,jobs:[]},{complete:true,total:2,jobs:[]}])await assert.rejects(feishu.fetchPortals(site,{collect:async()=>bad}));
  await assert.rejects(feishu.fetchPortals(site,{collect:async s=>collection([portalRecord(s,'duplicate'),portalRecord(s,'duplicate')])}));
  await assert.rejects(feishu.fetchPortals({...site,portalPaths:['career','unknown']},{collect:async()=>collection([])}));
});
test('publisher recomputes every union raw portal post and rejects missing, altered or invented provenance', async()=>{
  const site=PROFILES.find(s=>s.key==='lilith_social'),r=await feishu.fetchPortals(site,{collect:async scope=>collection([portalRecord(scope,'shared')])});
  for(const alter of [j=>{delete j.portalPosts},j=>{j.portalPosts[1].rawPost.requirement='tampered'},j=>{j.portalPosts[1].portalPath='outside'},j=>{j.portalPosts.push(structuredClone(j.portalPosts[0]))},j=>{j.portalPath='outside'},j=>{j.requirements='tampered canonical'}]){const job=structuredClone(r.jobs[0]);alter(job);assert.throws(()=>normalizeJobs([job],site));}
});
test('second portal failure preserves old output/mtime, never publishes the successful first portal alone', async t=>{
  const site=PROFILES.find(s=>s.key==='lilith'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'ande-union-fail-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));const file=path.join(dir,'raw.json');fs.writeFileSync(file,'OLD\n');const mtime=fs.statSync(file).mtimeMs;let calls=0;
  await assert.rejects(feishu.run([JSON.stringify(site),file],{sleepImpl:async()=>{},request:async(body,scope)=>{calls++;if(scope.websitePath==='intern')throw new Error('second portal failed');return response([rawPost('campus')]);}}));assert.equal(calls,3);assert.equal(fs.readFileSync(file,'utf8'),'OLD\n');assert.equal(fs.statSync(file).mtimeMs,mtime);
});
test('ambiguous two named categories and unreviewed custom text fields are not silently lost',()=>{
  const site=PROFILES[0];for(const fields of [{job_function:{name:'different'}},{job_post_info:{job_post_object_value_map:{extra:'independent JD'}}},{job_post_info:{job_post_object_value_map:[]}}])assert.throws(()=>feishu.normalizePost({...rawPost(),...fields},site));
});
