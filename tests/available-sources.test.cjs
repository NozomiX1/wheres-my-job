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
function xInfo(patch = {}) {
  return { recruitment_type: null, HighlightList: [], JobChannelPublishList: [], job_post_object_value_map: {}, address_list: [], city_list: [],
    correlation_job_list: [], tag_list: [], storefront_list: [], target_major_list: [], job_post_process_time_list: [], job_level_id_list: [], ...patch };
}
function xDetail(job, patch = {}) {
  return { code: 0, message: 'ok', error: null, data: { recommend_job_post_List: [], job_post_detail: {
    id: job.jobPostId, title: job.title, description: job.description, requirement: job.requirement, recruit_type: null,
    publish_time: job.publishTime, channel_online_status: 0, code: job.larkJobCode, job_id: job.jobId,
    city_list: job.cityZhNames.map(name => ({ name })), job_post_info: xInfo(), city_info_list_for_delivery: [], tag_list: [],
    storefront_mode: 1, storefront_list: [], process_type: 1, ...patch } } };
}
test('Xiaomi social detail binds the official anonymous GET and the exact renderer fields; unknown JD rejects', () => {
  const job = xJob(), request = x.socialDetailRequest(job);
  a.deepEqual(request, { url: x.SOCIAL_PROFILE.detailApi + '/' + job.jobPostId + '?portal_type=6&with_recommend=false', method: 'GET', body: null,
    headers: { Accept: 'application/json', 'website-path': 'index', 'accept-language': 'zh-CN', Referer: job.url } });
  a.equal(x.validateSocialDetail(xDetail(job), job), true);
  for (const mutate of [d => d.code = 1, d => d.message = 'okx', d => d.error = {}, d => d.data.recommend_job_post_List = [job],
    d => delete d.data.job_post_detail.title, d => d.data.job_post_detail.extra = 'x', d => d.data.job_post_detail.id = xJob(2).jobPostId,
    d => d.data.job_post_detail.job_id = xJob(2).jobId, d => d.data.job_post_detail.description = 'changed',
    d => d.data.job_post_detail.code = '   ', d => d.data.job_post_detail.job_post_info.job_post_object_value_map = { 7595885661741271302: '课题' },
    d => d.data.job_post_detail.job_post_info.HighlightList = ['亮点'], d => d.data.job_post_detail.job_post_info.correlation_job_list = ['关联'],
    d => d.data.job_post_detail.tag_list = ['标签'], d => d.data.job_post_detail.storefront_list = ['门店'],
    d => d.data.job_post_detail.job_post_info.unknown = 'x', d => delete d.data.job_post_detail.storefront_mode]) {
    const bad = xDetail(job); mutate(bad); a.throws(() => x.validateSocialDetail(bad, job));
  }
});
test('Xiaomi social detail enrichment validates all details then marks the two-column JD complete; refusal keeps list-only', async () => {
  const first = xJob(1), second = xJob(2), base = x.collectAvailable([xPage([first, second], 1, 2)]);
  a.equal(base.verification.version, 2); a.equal(base.jobs.some(j => Object.hasOwn(j, 'detail')), false);
  const ok = await x.attachDetails(base, x.SOCIAL_PROFILE, { sleep: async () => {}, detailFetch: async (url, options) => {
    const job = [first, second].find(j => url === x.socialDetailRequest(j).url);
    a.ok(job); a.equal(options.method, 'GET'); a.deepEqual(options.headers, x.socialDetailRequest(job).headers);
    return { status: 200, json: async () => xDetail(job) };
  } });
  a.equal(ok.verification.version, 3); a.equal(ok.verification.details.length, 2); a.ok(ok.jobs.every(j => Object.hasOwn(j, 'detail')));
  a.match(ok.issues.join(';'), /已取得列表及全部详情/);
  a.equal(x.validateEvidence(ok.verification, ok.jobs, x.SOCIAL_PROFILE).total, 2);
  const jobs = normalizeJobs(ok.jobs, x.SOCIAL_PROFILE); a.ok(jobs.every(j => j.jdComplete)); a.equal(jobs[0].duty, first.description); a.equal(jobs[0].description, '');
  for (const mutate of [v => v.details[0].request.url = x.SOCIAL_PROFILE.api, v => v.details[0].httpStatus = 500,
    v => v.details[0].response.data.job_post_detail.id = xJob(3).jobPostId, v => v.details = [v.details[0]], v => v.version = 2]) {
    const bad = structuredClone(ok); mutate(bad.verification); a.throws(() => x.validateEvidence(bad.verification, bad.jobs, x.SOCIAL_PROFILE));
  }
  for (const reply of [{ status: 403 }, { status: 200, json: async () => ({ code: 1 }) }, { status: 200, json: async () => { throw new SyntaxError('not JSON'); } }]) {
    let calls = 0;
    const failed = await x.attachDetails(base, x.SOCIAL_PROFILE, { sleep: async () => {}, detailFetch: async () => { calls++; return reply; } });
    a.equal(calls, 1); a.equal(failed.verification.version, 2); a.equal(failed.jobs.some(j => Object.hasOwn(j, 'detail')), false);
    a.match(failed.issues.join(';'), /详情请求停止/); a.equal(normalizeJobs(failed.jobs, x.SOCIAL_PROFILE)[0].jdComplete, false);
    a.equal(x.validateEvidence(failed.verification, failed.jobs, x.SOCIAL_PROFILE).total, 2);
  }
});
test('Xiaomi social production run enriches details by default and keeps list-only mode explicit', async () => {
  const job = xJob(1), empty = { request: x.SOCIAL_PROFILE.api + '?keyword=&cityZhNames=&pageSize=10&pageNum=2&type=1', httpStatus: 200,
    response: { code: 0, message: '成功', traceId: null, data: { list: [], pageSize: 10, pageNum: 2, pageTotal: 1, total: 1 } } };
  const fetchImpl = async (url, options) => {
    if (url.includes('/api/v1/job/posts/')) return { status: 200, json: async () => xDetail(job) };
    const page = Number(new URL(url).searchParams.get('pageNum'));
    return { status: 200, json: async () => page === 1 ? xPage([job], 1, 1).response : empty.response };
  };
  const enriched = await x.run(x.SOCIAL_PROFILE, { fetchImpl, sleep: async () => {} });
  a.equal(enriched.verification.version, 3); a.equal(enriched.verification.details.length, 1);
  a.equal(normalizeJobs(enriched.jobs, x.SOCIAL_PROFILE)[0].jdComplete, true);
  const listOnly = await x.run(x.SOCIAL_PROFILE, { fetchImpl, sleep: async () => {}, withDetails: false });
  a.equal(listOnly.verification.version, 2); a.equal(normalizeJobs(listOnly.jobs, x.SOCIAL_PROFILE)[0].jdComplete, false);
});
