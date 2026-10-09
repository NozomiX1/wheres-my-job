'use strict';
const test = require('node:test'), a = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const api = require('../crawler/publish'), crawl = require('../crawler/crawl');
const ali = require('../crawler/lib/custom/ali_social_common');
const samples = require('./fixtures/ali-social-portals.json');
const T1 = '2026-10-01T00:00:00.000Z', T2 = '2026-10-05T18:00:00.000Z', T3 = '2026-10-05T18:01:00.000Z';
const copy = x => JSON.parse(JSON.stringify(x));
const sites = () => ali.PROFILES.filter(p => p.qualified).map(p => ({ key:p.key, company:p.company, ats:'custom', track:'social', batch:'社招', exclude:'(无)', adapter:'ali-social-portal-v1', listJD:true, apiOrigin:p.origin, url:p.url, api:p.api, body:ali.requestBody(p,1) }));
function native(site, jobs) {
  const page = (rows,index,total) => ({ request:ali.requestBody(site,index), httpStatus:200, response:{success:true,errorMsg:null,errorCode:null,content:{datas:copy(rows),totalCount:total,pageSize:10,currentPage:index}} });
  const scan = () => ({ pages:jobs.length ? [page(jobs,1,jobs.length),page([],2,0)] : [page([],1,0)] });
  return {complete:true,total:jobs.length,jobs:copy(jobs),verification:{version:1,key:site.key,api:site.api,scans:[scan(),scan()]}};
}
function fixture(t, site) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(),'ande-ali-evidence-test-'));
  t.after(() => fs.rmSync(root,{recursive:true,force:true}));
  const outDir = path.join(root,'out'), dataFile = path.join(root,'jobs.js');fs.mkdirSync(outDir);
  const record = (key,company,id) => ({id,sourceKey:key,company,title:'旧完整文字原样保留',city:'',channels:[],employment:null,talentPlan:null,date:null,dateKind:null,url:'https://old.invalid/job',duty:'旧职责',requirements:'旧要求',description:'',jdComplete:true});
  const baseline = {version:1,legacy:true,notices:['旧范围'],companies:[{name:site.company,initial:'A',aliases:'原别名'},{name:'保护来源',initial:'B',aliases:['原名']}],sources:[{key:site.key,company:site.company,status:'unverified',lastSuccess:null,lastAttempt:null,message:'旧来源未核',coverage:null},{key:'protected',company:'保护来源',status:'ready',lastSuccess:T1,lastAttempt:T1,message:'原成功不可改',coverage:'protected-existing-scope'}],jobs:[record(site.key,site.company,'legacy-'+site.key),record('protected','保护来源','protected:posting')]};
  fs.writeFileSync(dataFile,'globalThis.ANDE_DATA = '+JSON.stringify(baseline)+';\n');
  return {root,outDir,dataFile,baseline,raw:path.join(outDir,site.key+'_raw.json'),snapshot:path.join(outDir,site.key+'_snapshot.json'),status:path.join(outDir,site.key+'_status.json')};
}
function run(site, f, envelope) {
  let count = 0;
  const result = crawl.runCrawl(site,{outDir:f.outDir,now:()=>count++ ? T3 : T2,runner:(_cmd,args)=>{a.match(args[0],/ali_social_common\.js$/);a.deepEqual(JSON.parse(args[1]),site);fs.writeFileSync(args[2],JSON.stringify(envelope));return {status:0};}});
  return result;
}
function assertProtected(data,f) {
  a.deepEqual(data.companies,f.baseline.companies);
  a.deepEqual(data.sources.find(s=>s.key==='protected'),f.baseline.sources[1]);
  a.deepEqual(data.jobs.filter(j=>j.sourceKey==='protected'),[f.baseline.jobs[1]]);
}

test('Registry preserves eight independent sources: seven complete profiles and Cloud available only', () => {
  const registry=api.loadSites();a.equal(registry.length,70);
  for(const profile of ali.PROFILES){const site=registry.find(s=>s.key===profile.key);a.equal(site.company,profile.company);a.equal(site.ats,'custom');a.equal(ali.verifiedSource(site),profile.qualified);a.equal(ali.availableSource(site),profile.key==='aliyun_social');const command=crawl.adapterCommand(site,'/tmp/not-written');a.ok(command);a.match(command.script,/ali_social_common\.js$/);a.deepEqual(JSON.parse(command.args[0]),site);}
});

test('All seven sources carry native full evidence through crawl snapshot and the sole publisher', t => {
  for (const site of sites()) {
    const f = fixture(t,site), jobs = [copy(samples[site.key].postings[0])], env = native(site,jobs);
    a.equal(run(site,f,env).code,0);
    const snapshot = JSON.parse(fs.readFileSync(f.snapshot,'utf8'));a.deepEqual(snapshot.verification,env.verification);a.deepEqual(snapshot.jobs,jobs);
    const result = api.publish({outDir:f.outDir,dataFile:f.dataFile,sites:[site],keys:[site.key]});a.equal(result.code,0);a.deepEqual(result.updated,[site.key]);
    const data = api.readPublished(f.dataFile), published = data.jobs.find(j=>j.sourceKey===site.key);assertProtected(data,f);
    a.equal(published.id,site.key+':'+jobs[0].id);a.equal(published.duty,jobs[0].description.replace(/\r\n?/g,'\n').trim());a.equal(published.requirements,jobs[0].requirement.replace(/\r\n?/g,'\n').trim());
    a.deepEqual(published.channels,['social']);a.equal(published.employment,null);a.equal(published.talentPlan,null);a.equal(published.date,null);a.equal(published.dateKind,null);
    a.equal(data.sources.find(s=>s.key===site.key).lastSuccess,T3);a.ok(data.notices.includes(ali.portalNotice(site)));
  }
});

test('Missing evidence zero cannot promote in crawl or clear a legacy baseline in publisher', t => {
  for (const site of sites()) {
    const f=fixture(t,site),env=native(site,[]);delete env.verification;const bytes=fs.readFileSync(f.dataFile);
    a.equal(run(site,f,env).code,1);a.equal(fs.existsSync(f.snapshot),false);a.equal(fs.existsSync(f.raw),false);
    const coverage=api.coverageFor(site);fs.writeFileSync(f.snapshot,JSON.stringify({version:1,key:site.key,complete:true,completedAt:T3,coverage,jobs:[]}));fs.writeFileSync(f.status,JSON.stringify({version:1,key:site.key,status:'ready',lastAttempt:T2,lastSuccess:T3,message:'count is not proof',coverage}));
    const result=api.publish({outDir:f.outDir,dataFile:f.dataFile,sites:[site],keys:[site.key]});a.equal(result.written,false);a.deepEqual(fs.readFileSync(f.dataFile),bytes);
  }
});

test('Publisher rejects a snapshot whose jobs are emptied or unusable, even with a matching ready status', t => {
  const site=sites()[0];
  const mutators=[
    e=>{e.jobs=[];},
    e=>{e.jobs[0].name=' ';},
    e=>{e.jobs[0].positionUrl='https://evil.invalid'+e.jobs[0].positionUrl;}
  ];
  for(const mutate of mutators){const f=fixture(t,site),env=native(site,[copy(samples[site.key].postings[0])]);a.equal(run(site,f,env).code,0);const snapshot=JSON.parse(fs.readFileSync(f.snapshot,'utf8'));mutate(snapshot);fs.writeFileSync(f.snapshot,JSON.stringify(snapshot));const bytes=fs.readFileSync(f.dataFile);const result=api.publish({outDir:f.outDir,dataFile:f.dataFile,sites:[site],keys:[site.key]});a.equal(result.written,false);a.deepEqual(fs.readFileSync(f.dataFile),bytes);}
});

test('A failed later crawl restores raw and snapshot, retains real success clock, and cannot publish stale ready', t => {
  const site=sites()[0],f=fixture(t,site),env=native(site,[copy(samples[site.key].postings[0])]);a.equal(run(site,f,env).code,0);
  const raw=fs.readFileSync(f.raw),snapshot=fs.readFileSync(f.snapshot),published=fs.readFileSync(f.dataFile),bad=copy(env);bad.total=99;
  const result=crawl.runCrawl(site,{outDir:f.outDir,now:()=> '2026-10-05T19:00:00.000Z',runner:(_cmd,args)=>{fs.writeFileSync(args[2],JSON.stringify(bad));return {status:0};}});
  a.equal(result.code,1);a.equal(result.lastSuccess,T3);a.deepEqual(fs.readFileSync(f.raw),raw);a.deepEqual(fs.readFileSync(f.snapshot),snapshot);
  a.equal(api.publish({outDir:f.outDir,dataFile:f.dataFile,sites:[site],keys:[site.key]}).written,false);a.deepEqual(fs.readFileSync(f.dataFile),published);
});

test('Known Ali portal scope/ATS downgrade cannot dispatch another adapter or publish fake empty snapshots', t => {
  for(const original of sites())for(const patch of [{adapter:undefined},{key:'ali_alias',adapter:undefined,ats:'moka',orgId:'fake',siteId:1,site:'social',api:original.api.replace('https://','https://user:pw@')},{key:'ali_alias',adapter:undefined,ats:'beisen',api:original.apiOrigin+':443/unknown'},{key:'ali_alias',adapter:undefined,ats:'feishu',api:original.apiOrigin.toUpperCase()+'/unknown'}]){
    const bad={...copy(original),...patch};a.equal(crawl.adapterCommand(bad,'/tmp/not-written'),null);a.throws(()=>api.normalizeJobs([],bad));
    const coverage=api.coverageFor(bad);a.throws(()=>api.validateSnapshot({version:1,key:bad.key,complete:true,completedAt:T3,coverage,jobs:[]},{version:1,key:bad.key,status:'ready',lastAttempt:T2,lastSuccess:T3,message:'fake0',coverage},bad));
  }
  const cloud=api.loadSites().find(s=>s.key==='aliyun_social');a.equal(ali.availableSource(cloud),true);a.ok(crawl.adapterCommand(cloud,'/tmp/not-written'));a.throws(()=>api.normalizeJobs([],cloud));
  const coverage=api.coverageFor(cloud);a.throws(()=>api.validateSnapshot({version:1,key:cloud.key,complete:true,completedAt:T3,coverage,jobs:[],verification:{version:1,key:cloud.key,api:cloud.api,scans:[]}},{version:1,key:cloud.key,status:'ready',lastAttempt:T2,lastSuccess:T3,message:'fake complete cloud',coverage},cloud));
});

test('Malformed or relative declared portal URIs cannot retreat to generic Moka and clear a baseline', t => {
  const original=sites()[0];
  for(const apiValue of ['https://talent-holding.alibaba.com:bad/position/search','//talent-holding.alibaba.com/position/search',null,5]){
    const site={...original,key:'ali_alias',ats:'moka',adapter:undefined,api:apiValue,orgId:'unrelated',siteId:1,site:'social'};
    a.equal(ali.requiresVerification(site),true);a.equal(crawl.adapterCommand(site,'/tmp/not-written'),null);a.throws(()=>api.normalizeJobs([],site));
    const f=fixture(t,site),bytes=fs.readFileSync(f.dataFile);const result=crawl.runCrawl(site,{outDir:f.outDir,now:()=>T2,runner:()=>a.fail('Malformed URI must not dispatch a generic child')});a.equal(result.status,'unverified');
    const coverage=api.coverageFor(site);fs.writeFileSync(f.snapshot,JSON.stringify({version:1,key:site.key,complete:true,completedAt:T3,coverage,jobs:[]}));fs.writeFileSync(f.status,JSON.stringify({version:1,key:site.key,status:'ready',lastAttempt:T2,lastSuccess:T3,message:'fake ready zero',coverage}));
    a.equal(api.publish({outDir:f.outDir,dataFile:f.dataFile,sites:[site],keys:[site.key]}).written,false);a.deepEqual(fs.readFileSync(f.dataFile),bytes);
  }
});

test('Unknown native count, continuation and business envelope fields fail closed even in apparent zero', t => {
  for(const site of sites())for(const patch of [{content:{currentCount:'UNKNOWN'}},{content:{currentCount:-1}},{content:{currentCount:777}},{content:{hasMore:true}},{content:{total:677}},{outer:{Success:false}},{outer:{code:403}},{missing:'errorCode'},{missing:'errorMsg'}]){
    const f=fixture(t,site),env=native(site,[]),bytes=fs.readFileSync(f.dataFile);
    for(const scan of env.verification.scans){const response=scan.pages[0].response;if(patch.content)Object.assign(response.content,patch.content);if(patch.outer)Object.assign(response,patch.outer);if(patch.missing)delete response[patch.missing];}
    a.equal(run(site,f,env).code,1);a.equal(fs.existsSync(f.snapshot),false);
    const coverage=api.coverageFor(site);fs.writeFileSync(f.snapshot,JSON.stringify({version:1,key:site.key,complete:true,completedAt:T3,coverage,jobs:[],verification:env.verification}));fs.writeFileSync(f.status,JSON.stringify({version:1,key:site.key,status:'ready',lastAttempt:T2,lastSuccess:T3,message:'fake zero native',coverage}));
    a.equal(api.publish({outDir:f.outDir,dataFile:f.dataFile,sites:[site],keys:[site.key]}).written,false);a.deepEqual(fs.readFileSync(f.dataFile),bytes);
  }
});
