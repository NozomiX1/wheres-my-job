'use strict';
const test=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const x=require('../crawler/lib/custom/xiaomi_portal'),{runCrawl}=require('../crawler/crawl'),{publish,readPublished,coverageFor}=require('../crawler/publish');
const site=x.SOCIAL_PROFILE;
// Synthetic native records exercise migration guards, not official coverage claims.
function post(id){return {id,title:'岗位 '+id,cityZhNames:['上海'],levelOneDeptName:'部门',description:'已有职责 '+id,requirement:'已有要求 '+id,expectedJobLevel:null,publishTime:null,larkJobCode:'J'+id,type:1,url:'https://xiaomi.jobs.f.mioffice.cn/index/position/'+(100+id)+'/detail',jobId:String(200+id),jobPostId:String(100+id)};}
function raw(rows){return {complete:false,total:rows.length,jobs:rows,issues:[],verification:{version:4,policy:'available',key:site.key,api:site.api,pages:1,issues:[]}};}
function setup(t){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ande-scope-extension-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));const file=path.join(dir,'jobs.js');let n=0;const crawl=rows=>{const r=runCrawl(site,{outDir:dir,now:()=>`2026-01-01T00:00:${String(n).padStart(2,'0')}.000Z`,runner:(_,args)=>{fs.writeFileSync(args.at(-1),JSON.stringify(raw(rows)));return {status:0};}});n++;a.equal(r.code,0);};
 crawl([post(1)]);a.equal(publish({sites:[site],keys:[site.key],outDir:dir,dataFile:file}).code,0);
 const old=readPublished(file);const oldSite={...site,batch:'明确的旧限定范围'};old.sources[0].coverage=coverageFor(oldSite);old.jobs.push({...old.jobs[0],id:'untouched:1',sourceKey:'untouched',company:'其它'});old.sources.push({...old.sources[0],key:'untouched',company:'其它'});old.companies.push({name:'其它',initial:'Q',aliases:[]});fs.writeFileSync(file,'globalThis.ANDE_DATA = '+JSON.stringify(old)+';\n');
 crawl([{...post(1),description:'新职责',requirement:null},post(2)]);return {dir,file,old,options:{sites:[site],keys:[site.key],outDir:dir,dataFile:file}};}
test('a changed registry scope needs no special flag: an incomplete update merges and keeps old unobserved records',t=>{
 const s=setup(t),r=publish(s.options);
 a.equal(r.code,0);a.equal(r.data.jobs.length,3);
 a.equal(r.data.jobs.find(j=>j.id===s.old.jobs[0].id).duty,'新职责');
 a.deepEqual(r.data.jobs.find(j=>j.id==='untouched:1'),s.old.jobs.find(j=>j.id==='untouched:1'));
 a.notEqual(r.data.sources.find(x=>x.key===site.key).coverage,s.old.sources[0].coverage);
});
