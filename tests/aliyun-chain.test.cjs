'use strict';
const test=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const ali=require('../crawler/lib/custom/ali_social_common'),pub=require('../crawler/publish'),{runUpdate}=require('../crawler/update');
const site=pub.loadSites().find(s=>s.key==='aliyun_social'),copy=v=>structuredClone(v),T1='2026-10-09T00:00:00.000Z',T2='2026-10-09T00:00:01.000Z';
function rawJob(){const j=copy(require('./fixtures/ali-social-portals.json').alibaba_social.postings[0]);j.name='  官网原标题  ';j.isLingYang=false;j.description=' \r\n<T>&amp;  独立职责\r尾  ';j.requirement=' \r\n独立要求  &lt;\r尾  ';return j;}
function envelope(j=rawJob()){const request=ali.requestBody(site,1),response={success:true,errorMsg:null,errorCode:null,content:{datas:[j],totalCount:670,pageSize:500,currentPage:1}};return ali.collectCloudAvailable([{request,httpStatus:200,response}],site);}
function setup(t){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ande-aliyun-chain-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));return {outDir:path.join(dir,'out'),dataFile:path.join(dir,'data/jobs.js'),sites:[site]};}
function runner(env){return (_cmd,args)=>{fs.writeFileSync(args.at(-1),JSON.stringify(env));return {status:0};};}
test('Cloud independently traverses update/crawl/snapshot/publisher/catalog and retains exact native TEXT',t=>{
 const f=setup(t),env=envelope();let at=0;const result=runUpdate([site.key],{...f,runner:(_cmd,args)=>{const {runCrawl}=require('../crawler/crawl');const r=runCrawl(site,{outDir:f.outDir,runner:runner(env),now:()=>at++?T2:T1});return {status:r.code};}});
 a.equal(result.code,0);const data=pub.readPublished(f.dataFile),s=data.sources[0],j=data.jobs[0];a.equal(s.status,'ready');a.equal(s.lastSuccess,T2);a.equal(j.jdComplete,false);a.equal(j.title,env.jobs[0].name);a.equal(j.duty,env.jobs[0].description);a.equal(j.requirements,env.jobs[0].requirement);a.equal(j.date,null);a.deepEqual(j.channels,['social']);a.equal(j.employment,null);a.equal(j.talentPlan,null);const snapshot=JSON.parse(fs.readFileSync(path.join(f.outDir,site.key+'_snapshot.json')));a.equal(snapshot.complete,undefined);pub.validateSnapshot(snapshot,JSON.parse(fs.readFileSync(path.join(f.outDir,site.key+'_status.json'))),site);const catalog=pub.readPublished;
 a.ok(fs.existsSync(f.dataFile));a.ok(fs.existsSync(path.join(path.dirname(f.dataFile),'parts')));
});
test('Cloud cannot reuse zero or escape its independently qualified identity',t=>{
 const f=setup(t),env=envelope();const crawl=require('../crawler/crawl');for(const patch of [{company:'其它阿里'},{key:'ali_alias'},{ats:'moka'},{adapter:undefined},{body:{...site.body,regions:'杭州'}}]){const bad={...site,...patch};a.equal(crawl.adapterCommand(bad,'/tmp/not-written'),null);a.throws(()=>pub.normalizeJobs([],bad));}
 a.throws(()=>ali.collectCloudAvailable([{request:site.body,httpStatus:200,response:{success:true,errorMsg:null,errorCode:null,content:{datas:[],totalCount:0,pageSize:500,currentPage:1}}}],site));
});
test('A new Cloud result replaces the source, and an empty field never erases prior non-empty JD',t=>{
 const f=setup(t),crawl=require('../crawler/crawl'),first=rawJob();crawl.runCrawl(site,{outDir:f.outDir,runner:runner(envelope(first)),now:()=>T1});a.equal(pub.publish({...f,keys:[site.key]}).code,0);const old=pub.readPublished(f.dataFile).jobs[0];const second=rawJob();second.id++;second.trackId+='-next';second.positionUrl='/off-campus/position-detail?positionId='+second.id+'&track_id='+second.trackId;
 crawl.runCrawl(site,{outDir:f.outDir,runner:runner(envelope(second)),now:()=>T2});a.equal(pub.publish({...f,keys:[site.key]}).code,0);const afterSecond=pub.readPublished(f.dataFile).jobs;a.equal(afterSecond.length,1);a.ok(!afterSecond.some(j=>j.id===old.id),'jobs missing from the new result are gone');
 const empty={...second,description:'',requirement:null};crawl.runCrawl(site,{outDir:f.outDir,runner:runner(envelope(empty)),now:()=> '2026-10-09T00:00:02.000Z'});a.equal(pub.publish({...f,keys:[site.key]}).code,0);a.deepEqual(pub.readPublished(f.dataFile).jobs,afterSecond);
});
