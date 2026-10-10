'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const h=require('../crawler/lib/custom/huawei_portal'),http=require('../crawler/lib/custom/huawei_http');
const [campus,social]=h.PROFILES;
function list(id=36384){return {advertisementId:id,jobId:id+100000,jobName:'官网岗位',mainBusiness:'请您详见岗位意向中的岗位职责',jobRequire:'请您详见岗位意向中的岗位要求',workPlace:'上海/北京',categoryName:'研发类'};}
function raw(request,data){return {request,httpStatus:200,response:{status:'SUCCESS',data,errors:null}};}
function proof(site=campus){const l=list();return h.collectAvailable(site,[raw(http.requests.page(site.key,1),{pageVO:{curPage:1,pageSize:10,totalRows:1},result:[l]}),raw(http.requests.page(site.key,2),{pageVO:{curPage:2,pageSize:10,totalRows:1},result:[]})],
  [raw(http.requests.detail(l.advertisementId),{...l,jobname:l.jobName,jobCity:'上海/北京',recruitType:http.TYPES[site.key]})],
  [raw(http.requests.intentions(l.jobId),[{jobId:l.jobId,positionIntentionId:1,positionIntention:'方向一',jobResponsibilities:'<p>同文 List&lt;T&gt;</p>',jobDemand:'<p>同文 List&lt;T&gt;</p>'},{jobId:l.jobId,positionIntentionId:2,positionIntention:'方向二',jobResponsibilities:'<p>最后职责</p>',jobDemand:'<p>最后要求</p>'}])]);}
test('Huawei exact independent scopes reject identity mutation and cannot infer completed source',()=>{
  for(const site of h.PROFILES){assert.ok(h.verifiedSource(structuredClone(site)));const p=proof(site);assert.ok(h.validateEvidence(p.verification,p.jobs,site));assert.equal(p.complete,false);
    for(const delta of [{key:'other'},{company:'另一公司'},{ats:'moka'},{fetchDetails:false},{body:{...site.body,keyword:'算法'}}]){const bad={...site,...delta};assert.ok(h.requiresVerification(bad));assert.equal(h.verifiedSource(bad),false);assert.throws(()=>h.validateJobs(p.jobs,bad));}}
});
test('Huawei all intention directions retain HTML text and independent same-text columns',()=>{
  const p=proof(),j=h.normalizeRecord(p.jobs[0],campus);assert.equal(j.duty,'同文 List<T>\n最后职责');assert.equal(j.requirements,'同文 List<T>\n最后要求');
  assert.equal(j.description,'方向一\n岗位职责\n同文 List<T>\n岗位要求\n同文 List<T>\n\n方向二\n岗位职责\n最后职责\n岗位要求\n最后要求');
  assert.equal(j.id,'36384');assert.equal(j.jdComplete,false);assert.equal(j.date,null);assert.equal(j.employment,null);assert.ok(j.url.endsWith('advertisementId=36384'));
  const row={listed:list(),detail:null,intentions:null},missing=h.normalizeRecord(row,campus);assert.equal(missing.duty,'');assert.equal(missing.requirements,'');assert.equal(missing.description,'');
});
test('Huawei empty detail or intention body cannot erase acquired list JD',()=>{
  const p=proof();const row=structuredClone(p.jobs[0]);row.listed.mainBusiness='原始职责';row.listed.jobRequire='原始要求';row.detail.mainBusiness=null;row.detail.jobRequire=null;
  row.intentions=[];let j=h.normalizeRecord(row,campus);assert.equal(j.duty,'原始职责');assert.equal(j.requirements,'原始要求');
  row.intentions=[{jobId:row.listed.jobId,positionIntentionId:9,positionIntention:'方向',jobResponsibilities:null,jobDemand:null}];j=h.normalizeRecord(row,campus);assert.equal(j.duty,'原始职责');assert.equal(j.requirements,'原始要求');assert.ok(j.description.includes('原始职责')&&j.description.includes('原始要求'));
});

test('Huawei duplicate pages/total drift keep unique usable records and missing details are issues',()=>{
  const pages=[raw(http.requests.page(campus.key,1),{pageVO:{curPage:1,pageSize:10,totalRows:3},result:[list()]}),raw(http.requests.page(campus.key,2),{pageVO:{curPage:2,pageSize:10,totalRows:2},result:[list(),list(36385)]})];
  const p=h.collectAvailable(campus,pages);assert.equal(p.total,2);assert.ok(p.issues.some(x=>x.includes('重复')));assert.ok(p.issues.some(x=>x.includes('3→2')));
  const bad=structuredClone(p);bad.jobs=structuredClone(p.jobs);bad.jobs[0].listed.jobName='unbound';assert.throws(()=>h.validateEvidence(bad.verification,bad.jobs,campus),/binding/);
  pages[0].request.body.jobType='SR';assert.throws(()=>h.collectAvailable(campus,pages),/binding/);
  assert.throws(()=>h.collectAvailable(campus,[raw(http.requests.page(campus.key,1),{pageVO:{curPage:1,pageSize:10,totalRows:0},result:[]})]),/zero/);
});
test('Huawei detail/intention identities do not authorize mismatched or fabricated JD',()=>{
  const p=proof();p.verification.details[0].response.data.jobId++;const q=h.collectAvailable(campus,p.verification.pages,p.verification.details,p.verification.intentionPages);assert.equal(q.jobs[0].detail,null);assert.ok(q.issues.some(x=>x.includes('详情未应用')));
  p.verification.intentionPages[0].response.data[0].jobId++;const r=h.collectAvailable(campus,p.verification.pages,[],p.verification.intentionPages);assert.equal(r.jobs[0].intentions,null);
});
test('Huawei declared last page enters details instead of probing beyond it',async()=>{
  const l=list();let calls=0;
  const result=await h.fetchAvailable(campus,{sleep:async()=>{},fetchImpl:async(url)=>{
    calls++;if(calls===1)return {status:200,text:async()=>"jalorSecurityToken:''"};
    if(url===http.API)return {status:200,json:async()=>({status:'SUCCESS',errors:null,data:{pageVO:{curPage:1,pageSize:10,totalRows:1,totalPages:1},result:[l]}})};
    if(url.includes('getRecruitmentPositionDetail'))return {status:200,json:async()=>({status:'SUCCESS',errors:null,data:{...l,jobname:l.jobName,jobCity:'北京',recruitType:'CR',mainBusiness:'详细职责',jobRequire:'详细要求'}})};
    return {status:200,json:async()=>({status:'SUCCESS',errors:null,data:[]})};
  },maxPages:3});
  assert.equal(result.verification.pages.length,1);assert.equal(result.verification.details.length,1);assert.equal(result.verification.intentionPages.length,1);assert.equal(calls,4);
});

test('Huawei serial normal session stops after refusal, publishing earlier usable records only',async()=>{
  let calls=0,inflight=0;const options={sleep:async ms=>assert.ok(ms>=200),fetchImpl:async(url,opts)=>{
    assert.equal(++inflight,1);assert.equal(opts.redirect,'manual');assert.ok(opts.signal instanceof AbortSignal);assert.equal(Object.keys(opts.headers||{}).some(k=>/user-agent|cookie|authorization/i.test(k)),false);
    calls++;inflight--;if(calls===1)return {status:200,text:async()=>"jalorSecurityToken:''"};
    const b=JSON.parse(opts.body);assert.equal(opts.headers.Referer,'https://career.huawei.com/');
    if(calls===2)return {status:200,json:async()=>({status:'SUCCESS',data:{pageVO:{curPage:b.curPage,pageSize:10,totalRows:10},result:[list()]},errors:null})};
    return {status:403};
  }};
  const result=await h.fetchAvailable(campus,options);assert.equal(calls,3);assert.equal(result.total,1);assert.ok(result.issues.some(x=>x.includes('请求停止')));assert.equal(result.jobs[0].detail,null);
});

test('a posting with several 岗位意向 is split into one record per intention; 0 or 1 intention keep the official id', () => {
  const l = list(), intention = (id, name, extra = {}) => ({ jobId: l.jobId, positionIntentionId: id, positionIntention: ' ' + name + ' ', jobPlaceName: '', jobResponsibilities: name + '职责', jobDemand: name + '要求', ...extra });
  const many = { listed: l, detail: null, intentions: [intention(1, '算法', { jobPlaceName: '深圳/杭州' }), intention(2, '数据'), intention(3, '系统')] };
  const records = h.expand([many]).map(row => h.normalizeRecord(row, campus));
  assert.deepEqual(records.map(r => r.id), [l.advertisementId + '-1', l.advertisementId + '-2', l.advertisementId + '-3']);
  assert.deepEqual(records.map(r => r.title), ['官网岗位（算法）', '官网岗位（数据）', '官网岗位（系统）']);
  assert.deepEqual(records.map(r => [r.duty, r.requirements]), [['算法职责', '算法要求'], ['数据职责', '数据要求'], ['系统职责', '系统要求']]);
  assert.equal(records[0].city, '深圳/杭州'); assert.equal(records[1].city, l.workPlace, 'no own place → the posting place');
  assert.ok(records[1].description.includes('数据') && !records[1].description.includes('算法'), 'each record carries only its own intention');
  assert.equal(new Set(records.map(r => r.url)).size, 1, 'all point at the one official posting page');
  for (const intentions of [null, [], [intention(7, '唯一')]]) {
    const row = { listed: l, detail: null, intentions }, out = h.expand([row]);
    assert.equal(out.length, 1); assert.equal(h.normalizeRecord(out[0], campus).id, String(l.advertisementId));
    assert.equal(h.normalizeRecord(out[0], campus).title, '官网岗位');
  }
});

test('if a later run cannot fetch the intentions, the previously split records are kept instead of being replaced by a body-less posting', t => {
  const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
  const { runCrawl } = require('../crawler/crawl'), { publish, readPublished } = require('../crawler/publish');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ande-huawei-split-')); t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'jobs.js');
  fs.writeFileSync(file, 'globalThis.ANDE_DATA = ' + JSON.stringify({ version: 1, legacy: false, notices: [], companies: [], sources: [], jobs: [] }) + ';\n');
  const cycle = (envelope, at) => {
    assert.equal(runCrawl(campus, { outDir: dir, dataFile: file, now: () => at, runner: (_, args) => { fs.writeFileSync(args.at(-1), JSON.stringify(envelope)); return { status: 0 }; } }).code, 0);
    assert.equal(publish({ outDir: dir, dataFile: file, sites: [campus], keys: [campus.key] }).code, 0);
    return readPublished(file).jobs.map(j => j.id).sort();
  };
  const full = proof(), pages = full.verification.pages;
  const ids = cycle(full, '2026-01-01T00:00:00.000Z');
  assert.deepEqual(ids, ['huawei:36384-1', 'huawei:36384-2']);
  // 第二轮：列表照常，但详情与岗位意向都没取到（例如请求被中断）
  const partial = h.collectAvailable(campus, pages, [], []);
  assert.deepEqual(cycle(partial, '2026-01-02T00:00:00.000Z'), ids, 'the split records survive');
  const kept = readPublished(file).jobs[0]; assert.ok(kept.description.includes('方向'), 'with their own text');
  // 第三轮：意向又取到了，仍是拆分记录
  assert.deepEqual(cycle(proof(), '2026-01-03T00:00:00.000Z'), ids);
});
