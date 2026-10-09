// Offline fixed-source qualification, native facts and two complete scans. No live requests.
'use strict';
const test=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),p=require('node:path');
const b=require('../crawler/lib/beisen'),pub=require('../crawler/publish'),{runCrawl,adapterCommand}=require('../crawler/crawl');
const fixtures=require('./fixtures/beisen-portals.json'),sites=pub.loadSites().filter(s=>['iflytek','iflytek_social','vivo'].includes(s.key));
const copy=x=>JSON.parse(JSON.stringify(x)),marked=j=>({...copy(j),listJDVerified:true}),body=jobs=>({Code:200,TipType:'Success',Count:jobs.length,Data:jobs,Total:0});
function transport(pages,requests=[]){let i=0;return async(url,opts)=>{a.ok(i<pages.length,'Unexpected request beyond fixture');requests.push({url,body:JSON.parse(opts.body),headers:opts.headers,signal:opts.signal});const page=pages[i++];return {status:page.status??200,json:async()=>copy(page.json??page)};};}
const options=pages=>({fetchImpl:transport(pages),sleep:async()=>{}});
const completePages=(site,jobs)=>site.key==='iflytek'?[body(jobs),body(jobs),body(jobs),body(jobs)]:[body(jobs),body(jobs)];
function temp(t,site){const dir=fs.mkdtempSync(p.join(os.tmpdir(),'ande-beisen-offline-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));const outDir=p.join(dir,'out'),dataFile=p.join(dir,'jobs.js');fs.mkdirSync(outDir);const old={id:'legacy-'+site.key,sourceKey:site.key,company:site.company,title:'保旧岗位',city:'',category:'',channels:[],employment:null,talentPlan:null,date:null,dateKind:null,sourceStatus:null,url:'',duty:'',requirements:'',description:'',jdComplete:false};fs.writeFileSync(dataFile,'globalThis.ANDE_DATA = '+JSON.stringify({version:1,legacy:true,notices:[],companies:[{name:site.company,initial:'#',aliases:[]}],sources:[{key:site.key,company:site.company,status:'legacy',lastSuccess:null,lastAttempt:null,message:'历史',coverage:null}],jobs:[old]})+';\n');return {dir,outDir,dataFile};}

for(const site of sites){
 test(site.key+' fixed profile dispatch/body uses native scope and never occupational/project narrowing',async()=>{
  a.equal(b.verifiedSource(site),true);a.ok(adapterCommand(site).args[0].startsWith('{'));a.equal(adapterCommand(site).timeout,900000);
  const jobs=fixtures[site.key],requests=[],delays=[];const result=await b.fetchAll(site,site.category,{fetchImpl:transport(completePages(site,jobs),requests),sleep:async ms=>delays.push(ms),delayMs:0});
  a.equal(result.total,jobs.length);a.deepEqual(result.jobs,jobs.map(marked));a.equal(requests.length,site.key==='iflytek'?4:2);a.deepEqual(delays,site.key==='iflytek'?[150,150,150]:[150]);
  if(site.key==='iflytek')a.deepEqual(result.scopeWitness,{complete:true,total:jobs.length,jobs});
  for(const r of requests){a.equal(r.url,site.api);a.equal(r.body.PageIndex,0);a.equal(r.body.KeyWords,'');a.equal(r.body.SpecialType,0);a.equal(r.body.PortalId,'');a.equal(r.body.ClassificationOne,undefined);a.equal(r.headers['User-Agent'],undefined);a.ok(r.signal instanceof AbortSignal);if(site.key==='vivo'){a.equal(Object.hasOwn(r.body,'Category'),false);a.equal(r.body.PageSize,20);}else{if(site.key==='iflytek'&&(r===requests[0]||r===requests.at(-1)))a.equal(Object.hasOwn(r.body,'Category'),false);else a.deepEqual(r.body.Category,site.category);a.equal(r.body.PageSize,100);}a.ok(r.body.DisplayFields.includes('PostDate'));a.ok(r.body.DisplayFields.includes('Kind'));}
 });
 test(site.key+' pin checked before child, empty normalization and matching forged ready/coverage snapshot',t=>{
  const f=temp(t,site),before=fs.readFileSync(f.dataFile);let calls=0;
  const changes=[{adapter:undefined},{listJD:undefined},{listJD:false},{api:site.api+'/other'},{url:site.url+'?narrow=1'},{company:'同系统其他公司'},{ats:'custom'},{key:site.key+'_alias'},{category:['2']},{body:'{"ClassificationOne":["2"]}'},{matchKeyword:'算法'},{classificationOne:['2']},{portalId:'narrow'},{specialType:1},{fetchDetails:true},{apiOrigin:'https://unproven.example'},{linkTemplate:'https://unproven.example/{id}'},{track:site.track==='social'?undefined:'social'},{ats:'moka',listJD:undefined,adapter:undefined,orgId:'step',siteId:94905,site:'campus'},{api:site.api.replace('/Jobad/','/JobAd/'),key:'new_alias'}].filter(change=>!Object.hasOwn(change,'category')||JSON.stringify(change.category)!==JSON.stringify(site.category));
  for(const change of changes){const bad={...site,...change};a.equal(b.verifiedSource(bad),false,JSON.stringify(change));a.equal(adapterCommand(bad,'unused'),null);a.throws(()=>pub.normalizeJobs([],bad),/Beisen|Moka/);const result=runCrawl(bad,{outDir:f.outDir,runner:()=>{calls++;return {status:0};}});a.equal(result.code,1);const cov=pub.coverageFor(bad),time='2026-10-05T00:00:00.000Z';fs.writeFileSync(p.join(f.outDir,bad.key+'_status.json'),JSON.stringify({version:1,key:bad.key,status:'ready',lastAttempt:time,lastSuccess:time,message:'伪造',coverage:cov}));fs.writeFileSync(p.join(f.outDir,bad.key+'_snapshot.json'),JSON.stringify({version:1,key:bad.key,complete:true,completedAt:time,coverage:cov,jobs:[]}));a.equal(pub.publish({outDir:f.outDir,dataFile:f.dataFile,sites:[bad],keys:[bad.key]}).written,false);a.deepEqual(fs.readFileSync(f.dataFile),before);}
  a.equal(calls,0);
 });
 test(site.key+' HTTP/business/Count/page/identity/full RAW drift rejects the whole candidate and writes nothing',async t=>{
  const j=copy(fixtures[site.key][0]),file=p.join(temp(t,site).dir,'raw.json');fs.writeFileSync(file,'OLD RAW');
  const badFirst=[{status:405,json:{}},{Code:500,TipType:'Success',Data:[],Count:0},{TipType:'Success',Data:[],Count:0},{Code:200,Data:[],Count:0},{Code:200,TipType:'Error',Data:[],Count:0},{Code:200,TipType:'Success',Data:[]},{...body([]),Count:'0'},{...body([]),Total:1},...['Success','success'].flatMap(name=>[false,'true',null,0,1,{},[]].map(value=>({...body([]),[name]:value}))),body([{...j,Id:undefined}]),body([{...j,JobAdId:'190000000'}]),body([{...j,Duty:{text:'unknown'}}]),body([{...j,CategoryId:'999'}]),body([{...j,Category:'未证渠道'}]),{...body([j]),Count:2},body([j,j])];
  for(const response of badFirst)await a.rejects(b.run([JSON.stringify(site),file],options([response])));
  for(const response of [body([{...j,Require:j.Require+'正文变动'}]),body([{...j,unknownNewField:'必须被检测'}]),{status:403,json:{}},{...body([j]),Count:0}])await a.rejects(b.run([JSON.stringify(site),file],options(site.key==='iflytek'?[body([j]),body([j]),response,body([j])]:[body([j]),response])));
  a.equal(fs.readFileSync(file,'utf8'),'OLD RAW');
  await a.rejects(b.fetchAll(site,site.category,{...options([{...body([j]),Count:2}]),pageSize:1,maxPages:2}),/ceiling/);
  const n=marked(j);for(const field of ['Id','JobAdId','JobAdName','LocNames','Duty','Require'])a.throws(()=>pub.normalizeJobs([{...n,[field]:undefined}],site),/Beisen/);
  for(const [field,value]of [['Kind',1],['LocNames',['北京',{}]],['ClassificationOne',{}],['ClassificationTwo',[]],['PostDate',123],['Status',false],['PostDateInt','0'],['listJDVerified',false]])a.throws(()=>pub.normalizeJobs([{...n,[field]:value}],site),/Beisen/);
 });
 test(site.key+' ordinary TEXT JD preserves native full fields/angles/entities; aliases cannot inject facts',()=>{
  const j=marked(fixtures[site.key][0]),raw={...j,Duty:'第一行\nList<T>  C++  AI &amp; x &lt;p&gt;保留为字面标记&lt;/p&gt; &quot;引用&quot;\n招聘@example.com',Require:'Qualifications:\nPython English 完整尾部',title:'伪造标题',description:'截断',category:'伪造职能',employment:'internship',channels:['social'],talentPlan:false,date:'1999-01-01',sourceStatus:'closed',url:'javascript:alert(1)',Id:j.Id,JobAdId:j.JobAdId};
  const n=pub.normalizeJobs([raw],site)[0];a.equal(n.title,j.JobAdName);a.equal(n.id,site.key+':'+j.Id);a.equal(n.duty,'第一行\nList<T>  C++  AI & x <p>保留为字面标记</p> "引用"\n招聘@example.com');a.equal(n.requirements,raw.Require);a.equal(n.description,'');a.equal(n.jdComplete,true);a.equal(n.sourceStatus,String(j.Status));a.ok(n.url.startsWith(new URL(site.api).origin));a.ok(n.url.endsWith('?jobAdId='+j.Id));a.equal(n.date,j.PostDate.slice(0,10));a.equal(n.dateKind,'published');a.notEqual(n.category,'伪造职能');
  const duplicate=pub.normalizeJobs([{...j,Duty:'官网两栏同样填写的全部文字',Require:'官网两栏同样填写的全部文字'}],site)[0];a.equal(duplicate.duty,duplicate.requirements,'Do not remove an actually supplied independent official field');
 });
 test(site.key+' official empty/null text remains honest; no date/Kind/talent from title or collection clock',()=>{
  const j=marked(fixtures[site.key][0]);for(const [Duty,Require]of [['',''],[null,null],['。','/']]){const n=pub.normalizeJobs([{...j,Duty,Require,PostDate:'0001-01-01T00:00:00',PostDateInt:0,Kind:'',JobAdName:'AI实习生顶尖人才',ClassificationOne:null}],site)[0];a.equal(n.jdComplete,false);a.equal(n.date,null);a.equal(n.dateKind,null);a.equal(n.employment,null);if(!['4','5','7'].includes(j.CategoryId))a.equal(n.talentPlan,null);}
  const f=pub.normalizeJobs([{...j,PostDate:null,PostDateInt:0,ChangeDate:'2026-09-30T00:00:00'}],site)[0];a.equal(f.date,null);a.equal(f.dateKind,null);
 });
}

test('Per-tenant classification/category/Kind/plan semantics and real official UUID hrefs are independent',()=>{
 const get=(key,i)=>pub.normalizeJobs([marked(fixtures[key][i])],sites.find(s=>s.key===key))[0];
 a.equal(get('iflytek',0).category,'AI算法类');a.equal(get('iflytek',0).employment,null);a.deepEqual(get('iflytek',0).channels,['campus']);
 for(const i of [1,2]){a.equal(get('iflytek',i).talentPlan,true);a.deepEqual(get('iflytek',i).channels,['campus']);a.ok(get('iflytek',i).url.includes('/'+fixtures.iflytek[i].CategoryId+'/detail?'));}
 a.equal(get('iflytek',3).talentPlan,null);a.equal(get('iflytek',3).employment,null);a.equal(get('iflytek',4).talentPlan,true);a.deepEqual(get('iflytek',4).channels,[]);a.equal(get('iflytek',4).employment,'internship');
 a.equal(get('iflytek_social',0).category,'');a.equal(get('iflytek_social',0).employment,'full-time');a.deepEqual(get('iflytek_social',0).channels,['social']);
 a.equal(get('vivo',0).talentPlan,true);a.equal(get('vivo',0).category,'设计类','Native category is preserved even for an algorithm title');a.equal(get('vivo',1).employment,'full-time');a.deepEqual(get('vivo',1).channels,[]);a.ok(get('vivo',1).url.includes('/intern/detail?'));a.equal(get('vivo',2).employment,'internship');a.deepEqual(get('vivo',2).channels,['campus']);a.equal(get('vivo',3).employment,null);
 a.equal(b.verifiedSource(pub.loadSites().find(s=>s.key==='vivo_social')),false);a.equal(p.basename(adapterCommand(pub.loadSites().find(s=>s.key==='vivo_social'),'unused').script),'vivo_social_portal.js','Social qualification is independent of campus Beisen');
 const site=sites.find(s=>s.key==='iflytek'),j=marked(fixtures.iflytek[0]);a.throws(()=>pub.normalizeJobs([{...j,CategoryId:'3',Category:'实习生招聘'}],site),/requires re-verification/);
});

test('Iflytek full authority detects unclassified/new channels and incomplete partitions or outside-scope RAW drift',async()=>{
 const site=sites.find(s=>s.key==='iflytek'),j=copy(fixtures.iflytek[0]),social=copy(fixtures.iflytek_social[0]),wide=[j,social];
 const valid=await b.fetchAll(site,site.category,options([body(wide),body([j]),body([j]),body(wide)]));a.equal(valid.total,1);a.equal(valid.scopeWitness.total,2);a.deepEqual(valid.scopeWitness.jobs,wide);
 for(const bad of [{...j,CategoryId:null},{...j,CategoryId:'8',Category:'新增人才计划'}])await a.rejects(b.fetchAll(site,site.category,options([body([bad])])),/boundary/);
 const extra={...j,Id:'11111111-2222-3333-4444-555555555555',JobAdId:999999999};
 await a.rejects(b.fetchAll(site,site.category,options([body([...wide,extra]),body([j]),body([j]),body([...wide,extra])])),/authority\/channel partition/);
 await a.rejects(b.fetchAll(site,site.category,options([body(wide),body([j]),body([j]),body([j,{...social,Require:social.Require+'外部社会正文变化'}])])),/authority\/channel partition/);
});

test('Native request abort is honored and old raw is preserved without retry or a second scan',async t=>{
 const site=sites.find(s=>s.key==='vivo'),file=p.join(temp(t,site).dir,'raw.json');fs.writeFileSync(file,'OLD RAW');let calls=0;
 const hold=setTimeout(()=>{},100);
 try{await a.rejects(b.run([JSON.stringify(site),file],{timeoutMs:5,fetchImpl:async(_url,opts)=>{calls++;await new Promise((resolve,reject)=>opts.signal.addEventListener('abort',()=>reject(opts.signal.reason),{once:true}));}}),/timeout/i);a.equal(calls,1);a.equal(fs.readFileSync(file,'utf8'),'OLD RAW');}finally{clearTimeout(hold);}
});

test('Two complete scans compare all raw fields by identity, not native order, and support a verified genuine zero',async()=>{
 const site=sites.find(s=>s.key==='iflytek_social'),jobs=fixtures.iflytek_social;
 const result=await b.fetchAll(site,site.category,options([body(jobs),body([...jobs].reverse())]));a.deepEqual(result.jobs,jobs.map(marked));
 const zero=await b.fetchAll(site,site.category,options([body([]),body([])]));a.deepEqual({complete:zero.complete,total:zero.total,jobs:zero.jobs},{complete:true,total:0,jobs:[]});a.equal(b.validateEvidence(zero.verification,zero.jobs,site),true);
 await a.rejects(b.fetchAll(site.api,site.category,options([body([])])),/verified source profile/);
 a.equal(b.nativeText('&amp;lt;T&amp;gt;'),'&lt;T&gt;','Decode is exactly the native five-entity order, never repeated HTML decoding');
});
