const test=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),p=require('node:path');
const b=require('../crawler/lib/beisen'),crawl=require('../crawler/crawl'),pub=require('../crawler/publish'),fixtures=require('./fixtures/beisen-portals.json');
const sites=pub.loadSites().filter(s=>['iflytek','iflytek_social','vivo'].includes(s.key)),copy=x=>JSON.parse(JSON.stringify(x));
const native=jobs=>({Code:200,TipType:'Success',Count:jobs.length,Total:0,Data:jobs});
const opts=jobs=>({sleep:async()=>{},fetchImpl:async()=>({status:200,json:async()=>copy(native(jobs))})});
const marked=jobs=>jobs.map(j=>({...j,listJDVerified:true}));
function area(t){const dir=fs.mkdtempSync(p.join(os.tmpdir(),'ande-beisen-evidence-test-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));return dir;}
function oldData(site,file){const data={version:1,legacy:true,notices:[],companies:[{name:site.company,initial:'B',aliases:[]}],sources:[{key:site.key,company:site.company,status:'legacy',lastSuccess:null,lastAttempt:null,message:''}],jobs:[{id:'legacy-old',sourceKey:site.key,company:site.company,title:'旧岗位',city:'',category:'',channels:[],employment:null,talentPlan:null,date:null,dateKind:null,sourceStatus:null,url:site.url,duty:'',requirements:'',description:'',jdComplete:false}]};pub.atomicWrite(file,'globalThis.ANDE_DATA = '+JSON.stringify(data)+';\n');return fs.readFileSync(file,'utf8');}

test('Known real Beisen host spellings never regain legacy qualification',async()=>{
 for(const site of sites)for(const api of [site.api.replace('.com/','.com:443/'),site.api.replace('.com/','.com.:443/'),site.api.replace('https:','http:'),site.api.replace('https://','https://user@'),site.api.replace('/Jobad/','/JobAd/')]){
  const bad={...site,key:'alias',api};delete bad.adapter;delete bad.listJD;
  a.equal(b.requiresVerification(bad),true);a.equal(b.verifiedSource(bad),false);a.equal(crawl.adapterCommand(bad),null);a.throws(()=>pub.normalizeJobs([],bad));
  let calls=0;await a.rejects(b.fetchAll(api,site.category,{fetchImpl:async()=>{calls++;return{status:200,json:async()=>({Data:[],Count:0})};}}));a.equal(calls,0);
 }
});

test('Native page evidence survives the only crawl/snapshot/publisher path, including genuine zero',async t=>{
 for(const site of sites){const dir=area(t),out=p.join(dir,'out'),dataFile=p.join(dir,'jobs.js'),old=oldData(site,dataFile),empty=await b.fetchAll(site,site.category,opts([]));
  const run=envelope=>crawl.runCrawl(site,{outDir:out,now:()=> '2026-10-05T13:30:00.000Z',log:()=>{},runner:(_node,args)=>{fs.writeFileSync(args.at(-1),JSON.stringify(envelope));return{status:0};}});
  const success=run(empty);a.equal(success.code,0);const snap=p.join(out,site.key+'_snapshot.json'),snapshot=JSON.parse(fs.readFileSync(snap));a.deepEqual(snapshot.verification,empty.verification);a.equal(b.validateEvidence(snapshot.verification,snapshot.jobs,site),true);
  const saved=fs.readFileSync(snap,'utf8'),raw=p.join(out,site.key+'_raw.json'),savedRaw=fs.readFileSync(raw,'utf8');
  a.equal(run({complete:true,total:0,jobs:[]}).code,1);a.equal(fs.readFileSync(snap,'utf8'),saved);a.equal(fs.readFileSync(raw,'utf8'),savedRaw);a.equal(fs.readFileSync(dataFile,'utf8'),old);
  a.equal(run(empty).code,0);const published=pub.publish({outDir:out,dataFile,sites:[site],keys:[site.key],log:()=>{}});a.equal(published.written,true);a.equal(pub.readPublished(dataFile).jobs.length,0);
 }
});

test('Matching ready and coverage cannot publish an empty Beisen snapshot without native evidence',t=>{
 for(const site of sites){const dir=area(t),dataFile=p.join(dir,'jobs.js'),before=oldData(site,dataFile),out=p.join(dir,'out');fs.mkdirSync(out);const completedAt='2026-10-05T13:30:00.000Z',coverage=pub.coverageFor(site);
  pub.atomicWrite(p.join(out,site.key+'_snapshot.json'),JSON.stringify({version:1,key:site.key,complete:true,completedAt,coverage,jobs:[]}));pub.atomicWrite(p.join(out,site.key+'_status.json'),JSON.stringify({key:site.key,status:'ready',lastAttempt:completedAt,lastSuccess:completedAt,coverage}));
  const r=pub.publish({outDir:out,dataFile,sites:[site],keys:[site.key],log:()=>{}});a.equal(r.written,false);a.equal(r.code,1);a.equal(fs.readFileSync(dataFile,'utf8'),before);
 }
});

test('Beisen proof replays Count, business status, raw binding, requested scope and authority partition',async()=>{
 for(const site of sites){const jobs=copy(fixtures[site.key]),env=await b.fetchAll(site,site.category,opts(jobs));a.equal(b.validateEvidence(env.verification,env.jobs,site),true);
  for(const mutate of [e=>delete e.scans[0].pages[0].response.Count,e=>e.scans[0].pages[0].response.Code=403,e=>e.scans[0].pages[0].httpStatus=302,e=>e.scans[0].pages[0].request.KeyWords='仅算法',e=>e.scans[0].pages[0].response.Data[0].Duty+='单轮篡改',e=>e.scans.pop()]){const proof=copy(env.verification);mutate(proof);a.throws(()=>b.validateEvidence(proof,env.jobs,site));}
  const changed=copy(env.jobs);changed[0].Require+='快照篡改';a.throws(()=>b.validateEvidence(env.verification,changed,site));
 }
});

test('UUID-equivalent and native business-number duplicates are rejected before projection too',async()=>{
 for(const site of sites){const jobs=copy(fixtures[site.key]);for(const variant of [[jobs[0],{...jobs[0],Id:jobs[0].Id.toUpperCase(),JobAdId:999999999}],[jobs[0],{...jobs[1],JobAdId:jobs[0].JobAdId}]]){
  await a.rejects(b.fetchAll(site,site.category,opts(variant)),/Duplicate/);a.throws(()=>pub.normalizeJobs(marked(variant),site),/Duplicate/);
 }}
});

test('Stable missing native facts or a new nonempty native JD never count as verified shape',async()=>{
 for(const site of sites){const original=copy(fixtures[site.key][0]);for(const field of ['Kind','PostDate','PostDateInt','ClassificationOne','ClassificationTwo','Status','LocNames','JobVideoJd']){const job=copy(original);delete job[field];await a.rejects(b.fetchAll(site,site.category,opts([job])));a.throws(()=>pub.normalizeJobs(marked([job]),site));}
  for(const JobVideoJd of [{text:'新增完整JD'},'新增视频正文',[]])await a.rejects(b.fetchAll(site,site.category,opts([{...original,JobVideoJd}])),/additional JD/);
 }
});

test('Only proven native publication calendars pass; valid seven-decimal time and sentinels remain honest',()=>{
 for(const site of sites){const job=copy(fixtures[site.key][0]);a.equal(pub.normalizeJobs(marked([job]),site)[0].date,job.PostDate.slice(0,10));
  for(const PostDate of ['1700000000','2026-10-01Tnot-a-native-time','2026-10-01T99:60:00','2026-02-30T00:00:00'])a.throws(()=>pub.normalizeJobs(marked([{...job,PostDate}]),site));
  a.throws(()=>pub.normalizeJobs(marked([{...job,PostDateInt:job.PostDateInt+86400000}]),site),/mismatch/);
  for(const sentinel of [{PostDate:' 0001-01-01T00:00:00.0000000 ',PostDateInt:0},{PostDate:null,PostDateInt:0},{PostDate:'',PostDateInt:null}]){const n=pub.normalizeJobs(marked([{...job,...sentinel}]),site)[0];a.equal(n.date,null);a.equal(n.dateKind,null);}
 }
});
