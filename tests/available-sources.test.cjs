'use strict';
const test=require('node:test'), a=require('node:assert/strict'), fs=require('node:fs'), os=require('node:os'), path=require('node:path');
const m=require('../crawler/lib/custom/meituan_portal'), x=require('../crawler/lib/custom/xiaomi_portal');
const {runCrawl}=require('../crawler/crawl'), {publish,readPublished,normalizeJobs,validateSnapshot}=require('../crawler/publish');
// Synthetic native records: exercise the production policy, not live recruitment claims.
function mt(id='1') { return {jobUnionId:id,name:'岗位 '+id,projectId:null,projectName:null,jobType:'3',jobSpecialCode:'5',jobSource:'1',jobStatus:'000',jobFamily:'职能',jobFamilyGroup:'类别',cityList:[{code:null,name:'北京',children:null,sort:null,subCode:null,mapping:null,outerCode:null,bgNode:false}],workYear:null,department:[],desc:'',departmentIntro:null,jobDuty:'  原始职责 <T> &amp;\n',jobRequirement:'原始要求',precedence:null,highLight:null,otherInfo:null,firstPostTime:null,refreshTime:1,tag:null,expiredTime:null,socialRecommendJob:null}; }
function mtPage(rows,n,total=rows.length) { return {data:{list:rows,page:{pageNo:n,pageSize:10,totalPage:Math.ceil(total/10),totalCount:total},traceId:null},status:1,message:'成功'}; }
function mtRaw(payload,n) {const body=structuredClone(m.PROFILE.body);body.page.pageNo=n;return {request:m.protocol.request(m.PROFILE.api,body),httpStatus:200,response:payload};}
function xJob(id=1) {return {id,title:'  小米岗位 '+id+'  ',cityZhNames:['上海','北京'],levelOneDeptName:'部门',description:'  原始职责 <T> &amp;\n',requirement:'原始要求',expectedJobLevel:null,publishTime:'2026-01-01',larkJobCode:'J'+id,type:1,url:'https://xiaomi.jobs.f.mioffice.cn/index/position/'+(100+id)+'/detail',jobId:String(200+id),jobPostId:String(100+id)};}
function xPage(rows,n,total=rows.length) {return {request:{url:x.SOCIAL_PROFILE.api+'?'+new URLSearchParams({keyword:'',cityZhNames:'',pageSize:'10',pageNum:String(n),type:'1'}),method:'GET',body:null},httpStatus:200,response:{code:0,message:'成功',traceId:null,data:{list:rows,pageSize:10,pageNum:n,pageTotal:Math.ceil(total/10),total}}};}

test('available social fetch is single-round: duplicates/total drift/detail refusal publish known records without retry',async()=>{
  const rows=Array.from({length:11},(_,i)=>mt(String(i+1))), detail={...rows[0],departmentIntro:'仅在详情里的完整介绍'};
  const queue=[{response:mtPage(rows.slice(0,10),1,12)},{response:mtPage([rows[9],rows[10]],2,11)},{response:mtPage(null,3,11)},{response:{data:detail,status:1,message:'成功'}},{status:403,response:{}}],calls=[];
  const r=await m.fetchAvailable(m.PROFILE,{sleep:async ms=>a.equal(ms,200),fetchImpl:async(url,init)=>{calls.push({url,body:JSON.parse(init.body)});const item=queue.shift();a.ok(item,'must stop after refusal');return {status:item.status??200,json:async()=>item.response};}});
  a.equal(calls.length,5);a.equal(r.complete,false);a.equal(r.total,11);a.equal(r.verification.details.length,1);
  a.ok(r.issues.some(s=>s.includes('重复身份')));a.ok(r.issues.some(s=>s.includes('12→11')));a.ok(r.issues.some(s=>s.includes('请求停止')));
  const checked=m.validateEvidence(r.verification,r.jobs,m.PROFILE),jobs=normalizeJobs(r.jobs,m.PROFILE,{available:true,detailIds:checked.detailIds});
  a.equal(jobs[0].jdComplete,true);a.ok(jobs[0].description.includes('仅在详情里的完整介绍'));a.equal(jobs[1].jdComplete,false);a.equal(jobs[1].duty,rows[1].jobDuty);
  const bad=structuredClone(r.verification);bad.pages[0].request.body.keywords='AI';a.throws(()=>m.validateEvidence(bad,r.jobs,m.PROFILE),/binding/);
});

test('Xiaomi social publishes raw list TEXT/city order; missing JD or unsafe row is recorded, never fabricated',()=>{
  const first=xJob(), second={...xJob(2),description:null,requirement:null}, unsafe={...xJob(3),url:'https://evil.example/job'};
  const r=x.collectAvailable([xPage([first,second,unsafe,first],1,4),xPage([],2,4)]);
  a.equal(r.complete,false);a.equal(r.total,2);a.equal(x.validateEvidence(r.verification,r.jobs,x.SOCIAL_PROFILE).total,2);
  const jobs=normalizeJobs(r.jobs,x.SOCIAL_PROFILE);a.equal(jobs[0].city,'上海/北京');a.equal(jobs[0].title,first.title);a.equal(jobs[0].duty,first.description);a.deepEqual(jobs[0].channels,['social']);a.equal(jobs[0].jdComplete,false);a.equal(jobs[1].duty,'');a.equal(jobs[1].requirements,'');
  a.ok(r.issues.some(s=>s.includes('重复身份')));a.ok(r.issues.some(s=>s.includes('未应用')));a.throws(()=>x.collectAvailable([xPage([],1,0)]),/no usable/);
  const bad=structuredClone(r.verification);bad.pages[0].httpStatus=403;a.throws(()=>x.validateEvidence(bad,r.jobs,x.SOCIAL_PROFILE),/binding/);
});

test('partial snapshots use sole crawl/publisher chain, merge omitted records, preserve old JD, and cannot claim complete or clear zero',t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ande-available-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));const file=path.join(dir,'data.js');let sec=0;
  function apply(raw) {const times=['2026-01-01T00:00:'+String(sec++).padStart(2,'0')+'.000Z','2026-01-01T00:00:'+String(sec++).padStart(2,'0')+'.000Z'];const c=runCrawl(m.PROFILE,{outDir:dir,now:()=>times.shift(),runner:(_,args)=>{fs.writeFileSync(args.at(-1),JSON.stringify(raw));return {status:0};}});a.equal(c.code,0);a.equal(c.status,'available');return publish({outDir:dir,dataFile:file,sites:[m.PROFILE],keys:[m.PROFILE.key]});}
  const old=mt(), next=mt('2');a.equal(apply(m.collectAvailable([mtRaw(mtPage([old],1),1)])).code,0);
  const before=readPublished(file), other={...before.jobs[0],id:'other:1',sourceKey:'other',company:'其它'},source={...before.sources[0],key:'other',company:'其它'};before.jobs.push(other);before.sources.push(source);before.companies.push({name:'其它',initial:'Q',aliases:[]});fs.writeFileSync(file,'globalThis.ANDE_DATA = '+JSON.stringify(before)+';\n');
  const r=apply(m.collectAvailable([mtRaw(mtPage([next],1),1)]));a.equal(r.code,0);a.equal(r.data.jobs.length,3);a.deepEqual(r.data.jobs.find(j=>j.id==='meituan_social:1'),before.jobs[0]);a.deepEqual(r.data.jobs.find(j=>j.id==='other:1'),other);a.deepEqual(r.data.sources.find(s=>s.key==='other'),source);a.ok(r.data.notices.some(s=>s.includes('先发布可用岗位')));
  const blank={...old,jobDuty:'',jobRequirement:'',departmentIntro:null,desc:null,highLight:null,precedence:null};const kept=apply(m.collectAvailable([mtRaw(mtPage([blank],1),1)]));a.deepEqual(kept.data.jobs.find(j=>j.id==='meituan_social:1'),before.jobs[0]);
  const snapshot=JSON.parse(fs.readFileSync(path.join(dir,'meituan_social_snapshot.json'))),status=JSON.parse(fs.readFileSync(path.join(dir,'meituan_social_status.json')));a.equal(snapshot.complete,false);a.throws(()=>validateSnapshot({...snapshot,complete:true},status,m.PROFILE),/cannot claim/);
  const bytes=fs.readFileSync(file);const failed=runCrawl(m.PROFILE,{outDir:dir,now:()=> '2026-01-02T00:00:00Z',runner:(_,args)=>{fs.writeFileSync(args.at(-1),JSON.stringify({complete:false,total:0,jobs:[],verification:{policy:'available'}}));return {status:0};}});a.equal(failed.code,1);a.equal(publish({outDir:dir,dataFile:file,sites:[m.PROFILE],keys:[m.PROFILE.key]}).written,false);a.deepEqual(fs.readFileSync(file),bytes);
});

test('partial per-slot empty JD never erases an acquired requirement; reproject retains the real clock',t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ande-slot-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));const file=path.join(dir,'jobs.js');let sec=0;
  const apply=job=>{const raw=m.collectAvailable([mtRaw(mtPage([job],1),1)]);const c=runCrawl(m.PROFILE,{outDir:dir,now:()=>`2026-01-01T00:00:${String(sec++).padStart(2,'0')}Z`,runner:(_,args)=>{fs.writeFileSync(args.at(-1),JSON.stringify(raw));return {status:0};}});a.equal(c.code,0);return publish({outDir:dir,dataFile:file,sites:[m.PROFILE],keys:[m.PROFILE.key]});};
  apply(mt());const original=readPublished(file).jobs[0];apply({...mt(),jobDuty:'新取得职责',jobRequirement:null});const current=readPublished(file);a.equal(current.jobs[0].duty,'新取得职责');a.equal(current.jobs[0].requirements,original.requirements);
  a.equal(publish({outDir:dir,dataFile:file,sites:[m.PROFILE],keys:[m.PROFILE.key]}).written,false);
  const repaired=publish({outDir:dir,dataFile:file,sites:[m.PROFILE],keys:[m.PROFILE.key],reproject:true});a.equal(repaired.written,true);a.equal(repaired.data.sources[0].lastSuccess,current.sources[0].lastSuccess);a.deepEqual(repaired.data.jobs,current.jobs);
});

test('Xiaomi social runtime stops after first HTTP refusal and never retries; finite page ceiling yields labelled usable data',async()=>{
  let calls=0;a.equal(x.verifiedSource(x.SOCIAL_PROFILE),true);await a.rejects(x.fetchAvailable(x.SOCIAL_PROFILE,{sleep:async()=>{},fetchImpl:async()=>{calls++;return {status:403};}}),/HTTP/);a.equal(calls,1);
  const rows=Array.from({length:10},(_,i)=>xJob(i+1));const r=await x.fetchAvailable(x.SOCIAL_PROFILE,{maxPages:2,sleep:async()=>{},fetchImpl:async()=>({status:200,json:async()=>xPage(rows,1,100).response})});a.equal(r.complete,false);a.equal(r.total,10);a.ok(r.issues.some(s=>s.includes('安全上限')));
});
