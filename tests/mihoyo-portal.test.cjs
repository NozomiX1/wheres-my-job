'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const m = require('../crawler/lib/custom/mihoyo_portal');
const checkChain = require('./custom-portal-chain.cjs');
const [CAMPUS, SOCIAL] = m.PROFILES, clone = v => structuredClone(v);
// Native 7672 and 9528 details, independently observed with the six-section TEXT renderer.
// Inline first-party facts: these tests need neither /tmp research materials nor network.
const REAL = {
  id:'7672',code:'',title:'游戏客户端工具开发实习生',addressDetailList:[{addressId:'8',addressDetail:'上海'}],
  competencyTypeId:'1',competencyType:'程序&技术类',jobNatureId:3,jobNature:'实习',projectName:'实习生专项',
  description:'1、参与大型项目海量内容的工业化生产工具开发；\n2、参与设计和实现工具来支撑游戏内容的不同模块，如战斗、关卡、剧情演出、任务等；\n3、参与设计与开发工具提高游戏中各个环节的效率；\n4、掌握如何维护和提升现有工具的稳定性、易用性与人机功效，辨别对应内容制作管线中存在的效率和质量问题，主动寻找和提供改进方案。',
  jobRequire:'1、本科及以上学历，计算机或相关专业，2027届及之后毕业的在校同学；\n2、至少了解一门C系语言，至少精通一门面向对象的编程语言，并深入了解其思想、原理和底层细节；\n3、专业课程基础扎实，在程序语言、编译原理、数据结构、算法、计算机组成、计算机网络等课程、数据库等方向上有过系统的学习；\n4、善于分析和沟通，逻辑清晰，有强烈的求知欲和优秀的学习能力；\n5、实习时长不低于3个月，每周出勤至少4天（论文等学校特殊情况可灵活沟通）。',
  addition:'1、有实际游戏项目的开发经历或实习经历；\n2、接触学习过游戏开发引擎（比如Unity、虚幻引擎）；\n3、有 AIGC、代码大模型提效、AI 自动化、AI Agent 等相关AI应用经验者优先；\n4、可尽快到岗、全勤实习三个月以上的同学优先。',
  deliveryInstructions:'',hadDelivery:0,status:1,channelDetailIds:[1,2],objectId:'24',objectName:'2028届及之后毕业的在校生',
  projectId:4,hireType:1,hireTypeName:'校园招聘',hurry:true,tagList:[],jobSummary:''
};
const REAL_SOCIAL = {...clone(REAL),id:'9528',title:'构建开发工程师',jobNatureId:1,jobNature:'全职',projectName:'社会招聘',
  description:'1、开发并维护构建管线及相关工具；\n2、解决项目组日常构建问题；\n3、提升资产、代码持续集成效率，满足多分支、多平台构建需求。',
  jobRequire:'1、熟练掌握 C++、C#、python 等虚幻技术栈语言；\n2、熟悉 UAT、UGS、Horde、BuildGraph 等虚幻工具，有实际管线搭建经验；\n3、了解 Teamcity、Jenkins 等三方 CI/CD 的使用；\n4、有虚幻 5.4 以上版本项目开发经验，有多分支并行开发经验；\n5、良好的沟通协作能力，自驱动的学习能力和分析解决问题能力，责任心强。',
  addition:'',objectId:'9',objectName:'常规社招',projectId:5,hireType:0,hireTypeName:'社会招聘',hurry:false};
const LIST_FIELDS = 'id title addressDetailList competencyType jobNatureId jobNature projectName hurry channelDetailIds tagList jobSummary objectId objectName'.split(' ');
const SLOTS = ['jobSummary','description','jobRequire','addition','deliveryInstructions','objectName'];
const TITLES = ['岗位摘要','工作职责','任职要求','加分项','投递说明','面向对象'];
const row = j => Object.fromEntries(LIST_FIELDS.map(k => [k,clone(j[k])]));
const success = data => ({code:0,message:'',traceId:'',data,success:true,error:false});
function page(jobs,n=1) { return success({list:jobs.slice((n-1)*10,n*10).map(row),pageNo:n,pageSize:10,total:n>Math.ceil(jobs.length/10)?0:jobs.length}); }
function sequence(jobs=[REAL],after=jobs,afterLists=after) {
  return [jobs,after].flatMap((full,round)=>[...Array.from({length:Math.ceil(full.length/10)+1},(_,i)=>({url:CAMPUS.api,response:page(round?afterLists:full,i+1)})),...full.map(j=>({url:CAMPUS.detailApi,response:success(clone(j))}))]);
}
function options(queue,calls=[],delays=[]) { return {delayMs:0,sleep:async ms=>delays.push(ms),fetchImpl:async(url,init)=>{
  calls.push({url,...init,body:JSON.parse(init.body)}); const q=queue.shift();assert.ok(q,'No unexpected retry/request');assert.equal(url,q.url);
  if(q.error)throw q.error;
  return {status:q.httpStatus??200,json:async()=>{if(q.jsonError)throw q.jsonError;return clone(q.response);},headers:{getSetCookie:()=>['token=must-not-persist']}};
}}; }
const collected = (jobs=[REAL],site=CAMPUS) => m.fetchAll(site,options(sequence(jobs)));

test('two deeply frozen independent profiles; equivalent hosts qualify but identity/mode/scope edits never fall back',async()=>{
  function frozen(v){if(v&&typeof v==='object'){assert.equal(Object.isFrozen(v),true);Object.values(v).forEach(frozen);}}frozen(m.PROFILES);
  for(const p of m.PROFILES){assert.equal(m.verifiedSource(p),true);assert.equal(p.company,'米哈游');assert.equal(p.adapter,'mihoyo-portal-v1');assert.deepEqual(p.body.channelDetailIds,[1]);assert.equal(p.headers['Release-Tag'],'v26.9.0-260805');assert.equal(p.headers['User-Agent'],undefined);assert.ok(m.portalNotice(p).includes('channelDetailIds=[1]'));
    const equivalent=clone(p);for(const k of ['origin','apiOrigin','api','detailApi','url'])equivalent[k]=equivalent[k].replace(/https:\/\/([^/]+)/,(_,h)=>'https://'+h.toUpperCase()+':443');assert.equal(m.verifiedSource(equivalent),true);
    for(const change of [{key:'other'},{key:p.key===CAMPUS.key?SOCIAL.key:CAMPUS.key},{ats:'moka'},{adapter:undefined},{company:'其他'},{track:'other'},{fetchDetails:false},{headers:{...p.headers,'User-Agent':'Chrome'}},{body:{...clone(p.body),channelDetailIds:[]}},{body:{...clone(p.body),hireType:7}},{url:p.url+'/'},{api:CAMPUS.detailApi}]){const s={...clone(p),...change};assert.equal(m.verifiedSource(s),false);assert.equal(m.requiresVerification(s),true);await assert.rejects(m.fetchAll(s,{fetchImpl:()=>assert.fail('Unverified request')}),/Mihoyo/);}
  }
  const deleted=clone(CAMPUS);delete deleted.fetchDetails;assert.equal(m.verifiedSource(deleted),false);assert.equal(m.requiresVerification(deleted),true);
  const bypass={...deleted,key:'other',ats:'moka'};delete bypass.adapter;assert.equal(m.verifiedSource(bypass),false);assert.equal(m.requiresVerification(bypass),true);
  for(const value of [null,{},'/relative','POST '+CAMPUS.api,'https://[jobs.mihoyo.com]','https://jobs.mihoyo.com\\evil','https://user:pass@jobs.mihoyo.com/','http://JOBS.MIHOYO.COM:80/','https://jobs.mihoyo.com./','https://jobs.example.org/%oops'])assert.equal(m.requiresVerification({key:'other',ats:'moka',api:value}),true,String(value));
  assert.equal(m.requiresVerification({key:'other',api:'https://jobs.example.org/api',url:'https://jobs.example.org/'}),false);assert.equal(m.requiresVerification({key:'mihoyo'}),true);assert.equal(m.portalNotice({key:'mihoyo'}),'');
});

test('real complete TEXT and independent scoring slots, all locations/category, conservative metadata',()=>{
  for(const [j,p] of [[REAL,CAMPUS],[REAL_SOCIAL,SOCIAL]]){const before=clone(j),n=m.normalizeRecord(j,p);assert.deepEqual(j,before);assert.equal(n.duty,j.description);assert.equal(n.requirements,j.jobRequire);assert.equal(n.description,SLOTS.flatMap((k,i)=>j[k]?[TITLES[i]+'\n'+j[k]]:[]).join('\n\n'));assert.deepEqual(n.city,['上海']);assert.equal(n.category,'程序&技术类');assert.deepEqual(n.channels,[p.track]);assert.equal(n.url,p.url+'/'+j.id);assert.equal(n.sourceStatus,'1');for(const k of ['date','dateKind','talentPlan'])assert.equal(n[k],null);assert.equal(n.jdComplete,true);assert.equal(n.employment,p===CAMPUS?'internship':'full-time');}
  for(const nature of ['第三方编制','其他','constructor','toString'])assert.equal(m.normalizeRecord({...clone(REAL_SOCIAL),jobNature:nature,jobNatureId:5},SOCIAL).employment,null);
  const j=clone(REAL);j.addressDetailList.push({addressId:'13',addressDetail:'北京'});j.tagList=['AI+职能'];j.channelDetailIds=[1,2,7];assert.deepEqual(m.normalizeRecord(j,CAMPUS).city,['上海','北京']);assert.deepEqual(m.normalizeRecord(j,CAMPUS).channels,['campus']);assert.equal(m.validateJobs([j],CAMPUS),true);
});

test('all six headings/order/original whitespace/entities and long extras preserved; no extra scoring fields',()=>{
  const j=clone(REAL),texts=['  <T> &amp;\n\n摘要  ','\r\n职责原文  ','独立要求\n','加分项 ≠ 职责\n'.repeat(1200),'  投递说明\n','面向对象'];SLOTS.forEach((k,i)=>j[k]=texts[i]);
  const n=m.normalizeRecord(j,CAMPUS);assert.equal(n.description,texts.map((v,i)=>TITLES[i]+'\n'+v).join('\n\n'));assert.equal(n.duty,texts[1]);assert.equal(n.requirements,texts[2]);assert.ok(n.description.length>10000);assert.ok(n.description.includes('<T> &amp;'));assert.equal(Object.hasOwn(n,'addition'),false);
});

test('proved empty strings and nullable audience ID retained, but null/omitted/illegal TEXT or unknown fields rejected',async()=>{
  for(const value of ['','  ','---']){const j=clone(REAL);SLOTS.forEach(k=>j[k]=value);j.objectId=null;assert.equal(m.validateJobs([j],CAMPUS),true);const n=m.normalizeRecord(j,CAMPUS);assert.equal(n.jdComplete,false);assert.equal(n.duty,value);assert.equal(n.requirements,value);assert.equal((await collected([j])).jobs.length,1);}
  for(const k of Object.keys(REAL)){const j=clone(REAL);delete j[k];assert.throws(()=>m.normalizeRecord(j,CAMPUS),/own fields/);}
  for(const k of SLOTS)for(const value of [null,[],{},7])assert.throws(()=>m.validateJobs([{...clone(REAL),[k]:value}],CAMPUS),/Mihoyo/);
  for(const k of ['newJD','duty','requirements','url','date','employment','jdComplete'])for(const v of [null,''])assert.throws(()=>m.validateJobs([{...clone(REAL),[k]:v}],CAMPUS),/own fields/);
  for(const [k,v] of [['id',7672],['id','7672/evil'],['title',''],['channelDetailIds',[2]],['channelDetailIds',[1,1]],['channelDetailIds',['1']],['hireType',0],['hireTypeName','社会招聘'],['hurry',1],['projectId','4'],['status','1'],['hadDelivery',1],['objectId',24]])assert.throws(()=>m.validateJobs([{...clone(REAL),[k]:v}],CAMPUS),/Mihoyo/);
  for(const address of [{addressId:'8'},{addressId:'8',addressDetail:null},{addressId:'8',addressDetail:'上海',newJD:''},Object.create(REAL.addressDetailList[0])]){const j=clone(REAL);j.addressDetailList=[address];assert.throws(()=>m.validateJobs([j],CAMPUS),/Mihoyo/);}
  const sparse=clone(REAL);sparse.tagList=new Array(1);assert.throws(()=>m.validateJobs([sparse],CAMPUS),/sparse|array/);assert.throws(()=>m.validateJobs([REAL,clone(REAL)],CAMPUS),/duplicate/);
  assert.throws(()=>m.normalizeRecord(Object.create(REAL),CAMPUS),/shape/);const getter=clone(REAL);Object.defineProperty(getter,'title',{get:()=>REAL.title});assert.throws(()=>m.normalizeRecord(getter,CAMPUS),/data fields/);
});

test('fresh double complete lists plus every necessary detail, native request/HTTP/body bound and offline revalidated',async()=>{
  const jobs=Array.from({length:11},(_,i)=>({...clone(REAL),id:String(7672+i)})),q=sequence(jobs),calls=[],delays=[];
  const r=await m.fetchAll(CAMPUS,options(q,calls,delays));assert.equal(r.complete,true);assert.equal(r.total,11);assert.deepEqual(r.jobs,jobs);assert.equal(q.length,0);assert.equal(calls.length,28);assert.equal(m.validateEvidence(clone(r.verification),clone(r.jobs),clone(CAMPUS)),true);
  assert.deepEqual(delays,[...Array(14).fill(200),15000,...Array(14).fill(200)]);assert.deepEqual(calls[0].body,CAMPUS.body);assert.deepEqual(calls[3].body,{id:'7672',channelDetailIds:[1],hireType:1});
  for(const c of calls){assert.equal(c.method,'POST');assert.equal(c.redirect,'manual');assert.ok(c.signal instanceof AbortSignal);assert.deepEqual(c.headers,CAMPUS.headers);}
  for(const s of r.verification.scans){assert.equal(s.pages.length,3);assert.equal(s.pages.at(-1).response.data.total,0);assert.deepEqual(s.pages.at(-1).response.data.list,[]);assert.equal(s.details.length,11);assert.deepEqual(s.details[0].response.data,jobs[0]);assert.equal(s.details[0].httpStatus,200);}
  assert.ok(!JSON.stringify(r).includes('must-not-persist'));const social=await collected([REAL_SOCIAL],SOCIAL);assert.equal(m.validateEvidence(social.verification,social.jobs,SOCIAL),true);assert.throws(()=>m.validateEvidence(r.verification,r.jobs,SOCIAL),/scope|binding/);
});

test('HTTP/transport/native refusal or polluted exact typed envelopes stop immediately without retry',async()=>{
  const variants=[{httpStatus:403},{httpStatus:302},{httpStatus:'200'},{error:new Error('transport stop')},{jsonError:new SyntaxError('private body secret')}];
  for(const edit of [j=>j.code='0',j=>j.code=1,j=>j.success=false,j=>j.error=true,j=>j.message=null,j=>j.traceId=7,j=>delete j.code,j=>j.newJD='',j=>j.data.newJD=null,j=>delete j.data.total,j=>j.data.total='1',j=>j.data.pageNo='1',j=>j.data.pageSize=20]){const j=page([REAL]);edit(j);variants.push({response:j});}
  for(const v of variants){const calls=[];await assert.rejects(m.fetchAll(CAMPUS,options([{url:CAMPUS.api,response:page([REAL]),...v}],calls)));assert.equal(calls.length,1);}
});

test('in-range totals/slots/identities, exact endpoint and page ceiling reject fake zero or partial success',async()=>{
  const eleven=Array.from({length:11},(_,i)=>({...clone(REAL),id:String(7672+i)}));
  for(const edit of [j=>j.data.list=[],j=>j.data.list=null,j=>j.data.total=0,j=>j.data.total=12,j=>j.data.pageNo=3]){const bad=page(eleven,2);edit(bad);const calls=[];await assert.rejects(m.fetchAll(CAMPUS,options([{url:CAMPUS.api,response:page(eleven)},{url:CAMPUS.api,response:bad}],calls)),/Mihoyo/);assert.equal(calls.length,2);}
  for(const edit of [j=>j.data.total=1,j=>j.data.list=null,j=>j.data.pageNo=1,j=>j.data.list=[row(REAL)]]){const q=sequence();edit(q[1].response);await assert.rejects(m.fetchAll(CAMPUS,options(q)),/Mihoyo/);}
  const duplicate=clone(eleven);duplicate[10]=clone(duplicate[9]);await assert.rejects(m.fetchAll(CAMPUS,options(sequence(duplicate))),/duplicate/);
  const short=page(eleven);short.data.list.pop();await assert.rejects(m.fetchAll(CAMPUS,options([{url:CAMPUS.api,response:short}])),/short/);
  const calls=[];await assert.rejects(m.fetchAll(CAMPUS,options([{url:CAMPUS.api,response:page([])}],calls)),/zero/);assert.equal(calls.length,1);assert.throws(()=>m.validateJobs([],CAMPUS),/zero/);
  const cap=page([REAL]);cap.data.total=1981;await assert.rejects(m.fetchAll(CAMPUS,options([{url:CAMPUS.api,response:cap}])),/ceiling/);
  for(const opt of [{maxPages:2},{maxPages:201},{timeoutMs:0},{delayMs:-1},{fetchImpl:null}])await assert.rejects(m.fetchAll(CAMPUS,{...options(sequence()),...opt}),/limit|ceiling/);
});

test('every detail required: null/missing/native/HTTP/identity/scope/all list facts fail the entire source',async()=>{
  const edits=[j=>j.data=null,j=>delete j.data,j=>j.data.id='999',j=>j.data.hireType=0,j=>j.data.status=null,j=>j.data.newJD='',j=>delete j.data.addition,j=>j.error=true];
  for(const k of LIST_FIELDS)edits.push(j=>{const v=j.data[k];j.data[k]=Array.isArray(v)?(k==='tagList'?['changed']:[]):typeof v==='string'?v+'changed':typeof v==='boolean'?!v:v+1;});
  for(const edit of edits){const q=sequence(),calls=[];edit(q[2].response);await assert.rejects(m.fetchAll(CAMPUS,options(q,calls)),/Mihoyo/);assert.equal(calls.length,3);}
  const q=sequence(),calls=[];q[2].httpStatus=403;await assert.rejects(m.fetchAll(CAMPUS,options(q,calls)),/HTTP/);assert.equal(calls.length,3);
});

test('all native row/detail facts stable, not just JD/count; page ordering may change but drift stops immediately',async()=>{
  for(const k of ['description','jobRequire','addition','deliveryInstructions','jobSummary','objectName','code','competencyTypeId','projectId','status','hurry','tagList']){const j=clone(REAL);j[k]=k==='competencyTypeId'?'2':Array.isArray(j[k])?['changed']:typeof j[k]==='string'?j[k]+'changed':typeof j[k]==='boolean'?!j[k]:j[k]+1;await assert.rejects(m.fetchAll(CAMPUS,options(sequence([REAL],[j]))),/stable|binding|identity/);}
  const jobs=Array.from({length:11},(_,i)=>({...clone(REAL),id:String(7672+i)}));const r=await m.fetchAll(CAMPUS,options(sequence(jobs,clone(jobs).reverse())));assert.deepEqual(r.jobs,jobs);assert.equal(m.validateEvidence(r.verification,r.jobs,CAMPUS),true);
  const lists=clone(jobs);lists[0].objectId=null;const calls=[];await assert.rejects(m.fetchAll(CAMPUS,options(sequence(jobs,jobs,lists),calls)),/stable/);assert.equal(calls.length,15);
  const after=clone(jobs);after[0].deliveryInstructions='changed';const detailCalls=[];await assert.rejects(m.fetchAll(CAMPUS,options(sequence(jobs,after),detailCalls)),/stable/);assert.equal(detailCalls.length,18);
});

test('publisher-style evidence cannot be replaced by flags/count, another key, mutated request/raw or unbound jobs',async()=>{
  const r=await collected();
  for(const edit of [v=>v.key=SOCIAL.key,v=>v.api=CAMPUS.detailApi,v=>v.ready=true,v=>delete v.scans,v=>v.scans.pop(),v=>v.scans[0].details=[],v=>v.scans[0].details.push(clone(v.scans[0].details[0])),v=>v.scans[0].pages.pop(),v=>v.scans[0].pages.push(clone(v.scans[0].pages.at(-1))),v=>v.scans[0].pages[0].httpStatus=403,v=>v.scans[0].pages[0].request.body.channelDetailIds=[],v=>v.scans[0].details[0].request.body.id='999',v=>v.scans[0].details[0].request.headers.Cookie='token',v=>v.scans[0].details[0].response.data.addition+='changed']){const v=clone(r.verification);edit(v);assert.throws(()=>m.validateEvidence(v,clone(r.jobs),CAMPUS),/Mihoyo/);}
  const polluted=clone(r.verification);Object.setPrototypeOf(polluted.scans[0].pages[0].response,{code:0});assert.throws(()=>m.validateEvidence(polluted,r.jobs,CAMPUS),/shape/);
  const jobs=clone(r.jobs);jobs[0].deliveryInstructions='snapshot tampering';assert.throws(()=>m.validateEvidence(r.verification,jobs,CAMPUS),/snapshot/);assert.throws(()=>m.validateEvidence(r.verification,[],CAMPUS),/zero/);
});

test('native timeout signal, transport and JSON failures do not retry or expose JSON body',async()=>{
  let calls=0;await assert.rejects(m.fetchAll(CAMPUS,{sleep:async()=>{},timeoutMs:1,fetchImpl:async(_,init)=>{calls++;return new Promise((_,reject)=>{const hold=setTimeout(()=>reject(new Error('Timeout missing')),100);init.signal.addEventListener('abort',()=>{clearTimeout(hold);reject(init.signal.reason);},{once:true});});}}),/timeout|aborted/i);assert.equal(calls,1);
  await assert.rejects(m.fetchAll(CAMPUS,options([{url:CAMPUS.api,jsonError:new SyntaxError('SECRET body')}])) ,e=>e.message==='Mihoyo: invalid native JSON response');
});

test('both Mihoyo sources use the sole crawl/snapshot/publish chain and retain all six sections',async t=>{
  for (const [site, detail] of [[CAMPUS, REAL], [SOCIAL, REAL_SOCIAL]]) {
    const env = await collected([detail], site);
    await checkChain(t, site, env, bad => { bad.jobs[0].addition += ' unbound native extra'; }, 2400000);
  }
});

test('run creates only a fully validated atomic candidate; partial collection/disk failure preserves prior bytes/mtime',async t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ande-mihoyo-offline-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));const file=path.join(dir,'raw.json');
  const args=[JSON.stringify(CAMPUS),file],bad=()=>{const q=sequence([REAL,{...clone(REAL),id:'7673'}]);q[3].httpStatus=403;return options(q);};
  await assert.rejects(m.run(args,bad()),/HTTP/);assert.deepEqual(fs.readdirSync(dir),[]);fs.writeFileSync(file,'OLD\n');const before=fs.statSync(file,{bigint:true});
  await assert.rejects(m.run(args,bad()),/HTTP/);assert.equal(fs.readFileSync(file,'utf8'),'OLD\n');assert.equal(fs.statSync(file,{bigint:true}).mtimeNs,before.mtimeNs);
  const write=fs.writeFileSync;fs.writeFileSync=(fd,...rest)=>{if(typeof fd==='number'){write(fd,'PARTIAL');throw new Error('disk full');}return write(fd,...rest);};
  try{await assert.rejects(m.run(args,options(sequence())),/disk full/);}finally{fs.writeFileSync=write;}
  assert.equal(fs.readFileSync(file,'utf8'),'OLD\n');assert.deepEqual(fs.readdirSync(dir),['raw.json']);const r=await m.run(args,options(sequence()));assert.deepEqual(JSON.parse(fs.readFileSync(file,'utf8')),r);assert.equal(m.validateEvidence(r.verification,r.jobs,CAMPUS),true);assert.deepEqual(fs.readdirSync(dir),['raw.json']);
  await assert.rejects(m.run([JSON.stringify(CAMPUS)],bad()),/Usage/);
});
