'use strict';
const test=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const x=require('../crawler/lib/custom/xiaomi_portal'),{runCrawl}=require('../crawler/crawl'),{publish,readPublished,coverageFor}=require('../crawler/publish');
const site=x.SOCIAL_PROFILE;
// Synthetic native records exercise migration guards, not official coverage claims.
function post(id){return {id,title:'岗位 '+id,cityZhNames:['上海'],levelOneDeptName:'部门',description:'已有职责 '+id,requirement:'已有要求 '+id,expectedJobLevel:null,publishTime:null,larkJobCode:'J'+id,type:1,url:'https://xiaomi.jobs.f.mioffice.cn/index/position/'+(100+id)+'/detail',jobId:String(200+id),jobPostId:String(100+id)};}
function raw(rows){const page={request:{url:site.api+'?'+new URLSearchParams({keyword:'',cityZhNames:'',pageSize:'10',pageNum:'1',type:'1'}),method:'GET',body:null},httpStatus:200,response:{code:0,message:'成功',traceId:null,data:{list:rows,pageSize:10,pageNum:1,pageTotal:1,total:rows.length}}};return x.collectAvailable([page]);}
function setup(t){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ande-scope-extension-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));const file=path.join(dir,'jobs.js');let n=0;const crawl=rows=>{const r=runCrawl(site,{outDir:dir,now:()=>`2026-01-01T00:00:${String(n).padStart(2,'0')}.000Z`,runner:(_,args)=>{fs.writeFileSync(args.at(-1),JSON.stringify(raw(rows)));return {status:0};}});n++;a.equal(r.code,0);};
 crawl([post(1)]);a.equal(publish({sites:[site],keys:[site.key],outDir:dir,dataFile:file}).code,0);
 const old=readPublished(file);const oldSite={...site,batch:'明确的旧限定范围'};old.sources[0].coverage=coverageFor(oldSite);old.jobs.push({...old.jobs[0],id:'untouched:1',sourceKey:'untouched',company:'其它'});old.sources.push({...old.sources[0],key:'untouched',company:'其它'});old.companies.push({name:'其它',initial:'Q',aliases:[]});fs.writeFileSync(file,'globalThis.ANDE_DATA = '+JSON.stringify(old)+';\n');
 crawl([{...post(1),description:'新职责',requirement:null},post(2)]);return {dir,file,old,options:{sites:[site],keys:[site.key],outDir:dir,dataFile:file}};}
test('scope change still rejects ordinary update; explicit expected old coverage permits only preserving partial extension',t=>{
 const s=setup(t),bytes=fs.readFileSync(s.file);a.equal(publish(s.options).written,false);a.deepEqual(fs.readFileSync(s.file),bytes);
 const wrong=publish({...s.options,extendCoverage:{[site.key]:'registry-v1:{}'}});a.equal(wrong.written,false);a.match(wrong.errors.join(';'),/coverage changed/i);a.deepEqual(fs.readFileSync(s.file),bytes);
 const r=publish({...s.options,extendCoverage:{[site.key]:s.old.sources[0].coverage}});a.equal(r.code,0);a.equal(r.data.jobs.length,3);a.equal(r.data.jobs.find(j=>j.id===s.old.jobs[0].id).duty,'新职责');a.equal(r.data.jobs.find(j=>j.id===s.old.jobs[0].id).requirements,s.old.jobs[0].requirements);a.deepEqual(r.data.jobs.find(j=>j.sourceKey==='untouched'),s.old.jobs[1]);a.deepEqual(r.data.sources.find(j=>j.key==='untouched'),s.old.sources[1]);a.equal(r.data.sources[0].coverage,coverageFor(site));a.match(r.data.sources[0].message,/保旧扩增/);
});
test('extension retains old unobserved records and never uses omission as removal',t=>{
 const s=setup(t);const current=JSON.parse(fs.readFileSync(path.join(s.dir,site.key+'_snapshot.json')));const status=JSON.parse(fs.readFileSync(path.join(s.dir,site.key+'_status.json')));const r=raw([post(2)]);current.jobs=r.jobs;current.total=r.total;current.verification=r.verification;status.count=r.total;fs.writeFileSync(path.join(s.dir,site.key+'_snapshot.json'),JSON.stringify(current));fs.writeFileSync(path.join(s.dir,site.key+'_status.json'),JSON.stringify(status));
 const out=publish({...s.options,extendCoverage:{[site.key]:s.old.sources[0].coverage}});a.equal(out.code,0);a.deepEqual(out.data.jobs.find(j=>j.id===s.old.jobs[0].id),s.old.jobs[0]);
});
test('migration cannot smuggle unrelated keys, retire/reproject, change company or promote full completeness',t=>{
 const s=setup(t),extension={[site.key]:s.old.sources[0].coverage};
 for(const extendCoverage of [[],{unknown:s.old.sources[0].coverage},{[site.key]:true}])a.throws(()=>publish({...s.options,extendCoverage}),/extension/i);
 a.throws(()=>publish({...s.options,keys:[],extendCoverage:extension}),/extension/i);a.throws(()=>publish({...s.options,reproject:true,extendCoverage:extension}),/extension/i);a.throws(()=>publish({...s.options,keys:[],discardLegacy:true,extendCoverage:extension}),/extension/i);
 const before=fs.readFileSync(s.file);const changed=readPublished(s.file);changed.sources[0].company='另一个公司';fs.writeFileSync(s.file,'globalThis.ANDE_DATA = '+JSON.stringify(changed)+';\n');a.equal(publish({...s.options,extendCoverage:extension}).written,false);fs.writeFileSync(s.file,before);
 const snapFile=path.join(s.dir,site.key+'_snapshot.json'),snap=JSON.parse(fs.readFileSync(snapFile));snap.complete=true;fs.writeFileSync(snapFile,JSON.stringify(snap));a.equal(publish({...s.options,extendCoverage:extension}).written,false);a.deepEqual(fs.readFileSync(s.file),before);
});
