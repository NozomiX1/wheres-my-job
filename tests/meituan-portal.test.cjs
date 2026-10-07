'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const m = require('../crawler/lib/custom/meituan_portal');
const clone = value => structuredClone(value);
const LIST = 'https://zhaopin.meituan.com/api/official/job/getJobList';
const DETAIL = 'https://zhaopin.meituan.com/api/official/job/getJobDetail';
// Complete native 4721183269 detail, copied from the independently observed normal API/DOM.
// No /tmp fixture or network dependency; list differences below were also actually observed.
const REAL = {
  jobUnionId: '4721183269', name: '沙特SMB销售运营', projectId: null, projectName: null,
  jobType: '3', jobSpecialCode: '5', jobSource: '1', jobStatus: '000', jobFamily: '运营类', jobFamilyGroup: '业务运营',
  cityList: [{code:'009001001',name:'利雅得',children:null,sort:null,subCode:null,mapping:null,outerCode:null,bgNode:false}],
  workYear: '3年',
  department: [{code:null,name:'Keeta',children:null,sort:null,subCode:null,mapping:null,outerCode:null,bgNode:false}],
  desc: null,
  departmentIntro: 'Keeta是全球领先外卖平台美团旗下的独立品牌，肩负着“帮大家吃得更好，生活更好”的使命。依托美团深耕中国市场15年的技术与运营积淀，我们正引领全球餐饮与商品即时配送服务的创新与发展。\n\n自2023年成立以来，Keeta始终扎根社区并创造价值。我们为用户提供可靠的外卖体验，以智慧技术助餐厅提升经营效率，在为骑手拓宽收入来源的同时，也充分提供安全保障措施。基于这份多方共赢、共同成长的理念，我们的业务已从中国香港稳步拓展至中东及巴西，并持续向世界迈进。',
  jobDuty: '1、围绕订单增长、供给规模、商家质量、留存及销售效能等方向开展经营分析，通过数据洞察、市场研究和一线调研，识别业务问题与增长机会，输出清晰、可落地的策略建议；\n2、参与业务目标规划与拆解，制定商家增长、分层运营、竞争应对、营销活动及销售效能等策略，并持续跟踪、评估和复盘策略效果；\n3、负责多城市拓展、供给建设、合同换签、收入提升等重点项目，协调销售、产品、市场、配送等团队，推动关键问题解决及项目结果达成；\n4、深入一线销售场景，完成策略宣导、执行支持和反馈收集，持续优化销售机制、作战工具及标准化SOP。',
  jobRequirement: '1、本科及以上学历，具备3年以上销售运营、业务运营、经营分析或商业策略相关经验；有外卖、电商、本地生活或B2B业务经验者优先；\n2、具备较强的数据分析和结构化思考能力，熟练使用SQL等工具，能够独立完成业务诊断和策略输出；\n3、具备较强的项目管理及跨部门推动能力，能够在多线程、高变化的环境中明确优先级并推动结果落地；\n4、英语可作为工作语言，能够适应海外及跨文化团队协作环境；\n5、具备较强的责任心、自驱力和结果导向，既能进行策略思考，也愿意深入业务现场解决具体问题。',
  precedence: '',
  highLight: '1、深度参与Keeta沙特SMB业务的核心经营策略制定，拥有较大的业务影响范围；\n2、面对多城市、大规模销售团队和复杂商家生态，快速积累海外业务经营经验；\n3、团队处于从规模增长向精细化经营升级的阶段，具有充分的成长和发挥空间。',
  otherInfo: null, firstPostTime: 1787818720000, refreshTime: 1791277205000, tag: null, expiredTime: null, socialRecommendJob: true
};
function listRow(detail = REAL) {
  return {...clone(detail),cityList:detail.cityList.map(c=>({...clone(c),code:null})),workYear:null,desc:'',departmentIntro:null,precedence:null,firstPostTime:null,socialRecommendJob:null};
}
function success(data) { return {data,status:1,message:'成功'}; }
function page(rows, n = 1) {
  const totalPage = Math.ceil(rows.length / 10);
  return success({list:n > totalPage ? null : clone(rows.slice((n-1)*10,n*10)),page:{pageNo:n,pageSize:10,totalPage,totalCount:rows.length},traceId:null});
}
function sequence(details = [REAL], afterDetails = details, afterLists) {
  return [details,afterDetails].flatMap((jobs,round)=>{
    const lists = round === 1 && afterLists ? afterLists : jobs.map(listRow);
    return [...Array.from({length:Math.ceil(lists.length/10)+1},(_,i)=>({url:LIST,response:page(lists,i+1)})),...jobs.map(j=>({url:DETAIL,response:success(clone(j))}))];
  });
}
function options(queue, calls = [], delays = []) {
  return {delayMs:0,sleep:async ms=>delays.push(ms),fetchImpl:async (url,init)=>{
    calls.push({url,method:init.method,headers:clone(init.headers),body:JSON.parse(init.body),redirect:init.redirect,signal:init.signal});
    const item = queue.shift(); assert.ok(item,'Unexpected additional request'); assert.equal(url,item.url);
    if(item.error) throw item.error;
    return {status:item.httpStatus ?? 200,json:async()=>{if(item.jsonError)throw item.jsonError;return clone(item.response);},headers:{getSetCookie:()=>['sid=must-not-persist; Path=/']}};
  }};
}
async function collected(details = [REAL]) { return m.fetchAll(m.PROFILE,options(sequence(details))); }

test('fixed deeply frozen social profile; known or malformed URI cannot downgrade', async () => {
  assert.equal(m.verifiedSource(m.PROFILE),true);
  function frozen(value) { if(value && typeof value==='object'){assert.equal(Object.isFrozen(value),true);Object.values(value).forEach(frozen);} }
  frozen(m.PROFILE);
  assert.equal(m.PROFILE.key,'meituan_social'); assert.equal(m.PROFILE.company,'美团'); assert.equal(m.PROFILE.adapter,'meituan-portal-v1');
  assert.equal(m.PROFILE.fetchDetails,true); assert.equal(m.PROFILE.api,LIST);
  assert.deepEqual(m.PROFILE.body.jobType,[{code:'3',subCode:[]}]); assert.deepEqual(m.PROFILE.body.specialCode,[]);
  assert.equal(m.verifiedSource({...clone(m.PROFILE),apiOrigin:'https://ZHAOPIN.MEITUAN.COM:443/',api:LIST.replace('zhaopin.meituan.com','ZHAOPIN.MEITUAN.COM:443'),url:m.PROFILE.url.replace('zhaopin.meituan.com','ZHAOPIN.MEITUAN.COM:443')}),true);
  for(const change of [{key:'meituan'},{key:'other'},{company:'其它'},{ats:'moka'},{adapter:undefined},{track:'campus'},{batch:'校招'},{fetchDetails:false},{listJD:true},{url:m.PROFILE.url+'?keywords=AI'},{api:DETAIL},{apiOrigin:'https://example.org'},{body:{...clone(m.PROFILE.body),specialCode:['1']}},{body:{...clone(m.PROFILE.body),jobType:[{code:'1',subCode:[]}]}}]) {
    const site={...clone(m.PROFILE),...change}; assert.equal(m.verifiedSource(site),false); assert.equal(m.requiresVerification(site),true);
    await assert.rejects(m.fetchAll(site,{fetchImpl:()=>assert.fail('Unverified site must not request')}),/Meituan|美团/);
  }
  for(const value of ['/relative',null,{},'POST '+LIST,'https://[zhaopin.meituan.com]','https://zhaopin.meituan.com\\evil','\n'+LIST,'https://user:password@zhaopin.meituan.com/api','http://ZHAOPIN.MEITUAN.COM:80/api','https://zhaopin.meituan.com./api']) {
    assert.equal(m.requiresVerification({key:'other',ats:'moka',api:value}),true,String(value));
    assert.equal(m.verifiedSource({...clone(m.PROFILE),api:value}),false);
  }
  assert.equal(m.requiresVerification({key:'meituan'}),true); assert.equal(m.verifiedSource({key:'meituan'}),false);
  assert.equal(m.requiresVerification({key:'other',api:'https://jobs.example.org/api',url:'https://jobs.example.org/list#/jobs'}),false);
  assert.equal(m.requiresVerification({key:'other',api:'https://jobs.example.org/%oops'}),true);
  await assert.rejects(m.fetchAll(LIST,{fetchImpl:()=>assert.fail('String API cannot qualify')}),/Meituan|美团/);
});

test('real extra department JD is complete TEXT; canonical result has no native aliases or guessed facts', () => {
  const raw=clone(REAL),before=clone(raw),j=m.normalizeRecord(raw,m.PROFILE);
  assert.equal(j.id,REAL.jobUnionId); assert.equal(j.title,REAL.name); assert.equal(j.duty,REAL.jobDuty); assert.equal(j.requirements,REAL.jobRequirement);
  assert.equal(j.description,['部门介绍\n'+REAL.departmentIntro,'岗位职责\n'+REAL.jobDuty,'岗位基本要求\n'+REAL.jobRequirement,'岗位亮点\n'+REAL.highLight].join('\n\n'));
  assert.equal(REAL.departmentIntro.length,226); assert.equal(listRow().departmentIntro,null);
  assert.deepEqual(j.city,['利雅得']); assert.deepEqual(j.channels,['social']);
  for(const k of ['date','dateKind','employment','talentPlan']) assert.equal(j[k],null);
  assert.equal(j.category,''); assert.equal(j.sourceStatus,'000'); assert.equal(j.jdComplete,true);
  assert.equal(j.url,'https://zhaopin.meituan.com/web/position/detail?jobUnionId=4721183269&jobShareType=1');
  assert.deepEqual(raw,before);
  for(const k of ['jobUnionId','jobDuty','jobRequirement','desc','workYear','department','jobFamily','firstPostTime','refreshTime']) assert.equal(Object.hasOwn(j,k),false,k);
});

test('all six native sections keep heading/order/full whitespace/entities, without truncation or scoring relocation', () => {
  const j=clone(REAL),texts=['  <T> &amp;\n\n介绍  ','岗位原描述','\r\n  duty <T> &amp;  \n'.repeat(700),' require\n','条件优先 ≠ 职责','完整亮点'];
  ['departmentIntro','desc','jobDuty','jobRequirement','precedence','highLight'].forEach((k,i)=>j[k]=texts[i]);
  const n=m.normalizeRecord(j,m.PROFILE),titles=['部门介绍','岗位描述','岗位职责','岗位基本要求','具备以下条件优先','岗位亮点'];
  assert.equal(n.description,texts.map((v,i)=>titles[i]+'\n'+v).join('\n\n')); assert.equal(n.duty,texts[2]); assert.equal(n.requirements,texts[3]);
  assert.ok(n.description.length>10000); assert.ok(n.description.includes('<T> &amp;')); assert.ok(!n.duty.includes('条件优先'));
  j.cityList.push({...clone(j.cityList[0]),name:'第二城市'});j.department.push({...clone(j.department[0]),name:'第二部门'});
  assert.deepEqual(m.normalizeRecord(j,m.PROFILE).city,['利雅得','第二城市']); assert.equal(m.validateJobs([j],m.PROFILE),true);assert.equal(j.department.length,2);
});

test('legal empty/null/symbol JD is retained; empty duty is not fabricated from introduction or precedence', async () => {
  for(const value of [null,'','  ','---']) {
    const j=clone(REAL); for(const key of ['departmentIntro','desc','jobDuty','jobRequirement','precedence','highLight']) j[key]=value;
    assert.equal(m.validateJobs([j],m.PROFILE),true);const n=m.normalizeRecord(j,m.PROFILE);assert.equal(n.duty,value ?? '');assert.equal(n.requirements,value ?? '');assert.equal(n.jdComplete,false);
  }
  const j={...clone(REAL),jobDuty:null,precedence:'仅额外优先条件'};
  const result=await collected([j]);assert.equal(result.jobs.length,1);const n=m.normalizeRecord(result.jobs[0],m.PROFILE);assert.equal(n.duty,'');assert.ok(n.description.includes('仅额外优先条件'));assert.equal(n.requirements,REAL.jobRequirement);
});

test('strict own25 fields and own nested labels reject missing, unknown, aliases and unknown nonnull metadata', () => {
  for(const field of Object.keys(REAL)){const j=clone(REAL);delete j[field];assert.throws(()=>m.normalizeRecord(j,m.PROFILE),/field|shape|字段/);}
  for(const field of ['id','title','duty','requirements','description','url','date','dateKind','employment','talentPlan','category','channels','jdComplete','newJD'])for(const value of [null,''])assert.throws(()=>m.validateJobs([{...clone(REAL),[field]:value}],m.PROFILE),/field|shape|字段/);
  for(const field of ['projectId','projectName','otherInfo','tag'])assert.throws(()=>m.validateJobs([{...clone(REAL),[field]:'new unreviewed fact'}],m.PROFILE),/field|shape|null|字段/);
  for(const [field,value] of [['jobUnionId',4721183269],['jobType','1'],['jobSpecialCode','3'],['jobSource','2'],['jobStatus','001'],['jobDuty',[]],['refreshTime','1791277205000'],['socialRecommendJob',1]]) assert.throws(()=>m.validateJobs([{...clone(REAL),[field]:value}],m.PROFILE),/Meituan|美团/);
  for(const field of Object.keys(REAL.cityList[0])){const j=clone(REAL);delete j.cityList[0][field];assert.throws(()=>m.validateJobs([j],m.PROFILE),/label|field|shape|标签/);}
  for(const change of [{name:null},{name:''},{code:'unknown department code'},{children:[]},{bgNode:'false'},{newJD:null}]){const j=clone(REAL);Object.assign(j.department[0],change);assert.throws(()=>m.validateJobs([j],m.PROFILE),/Meituan|美团/);}
  const inherited=clone(REAL);inherited.cityList[0]=Object.create(REAL.cityList[0]);assert.throws(()=>m.validateJobs([inherited],m.PROFILE),/Meituan|美团/);
  const sparse=clone(REAL);sparse.cityList=new Array(1);assert.throws(()=>m.validateJobs([sparse],m.PROFILE),/Meituan|美团/);
  assert.throws(()=>m.validateJobs([clone(REAL),clone(REAL)],m.PROFILE),/Duplicate|重复/);
});

test('complete double lists plus all details bind raw response/request/HTTP; native jobs retain all25 facts', async () => {
  const jobs=Array.from({length:11},(_,i)=>({...clone(REAL),jobUnionId:String(4721183269+i)})),queue=sequence(jobs),calls=[],delays=[];
  const r=await m.fetchAll(m.PROFILE,options(queue,calls,delays));
  assert.equal(r.complete,true);assert.equal(r.total,11);assert.deepEqual(r.jobs,jobs);assert.equal(queue.length,0);assert.equal(calls.length,28);
  assert.equal(m.validateEvidence(clone(r.verification),clone(r.jobs),clone(m.PROFILE)),true);
  assert.deepEqual(delays,[...Array(14).fill(200),15000,...Array(14).fill(200)]);
  for(const c of calls){assert.equal(c.method,'POST');assert.deepEqual(c.headers,{'Content-Type':'application/json',Accept:'application/json'});assert.equal(c.redirect,'manual');assert.ok(c.signal instanceof AbortSignal);}
  assert.deepEqual(calls[0].body,m.PROFILE.body);assert.deepEqual(calls[3].body,{jobUnionId:jobs[0].jobUnionId,jobShareType:'1'});
  for(const scan of r.verification.scans){assert.equal(scan.pages.length,3);assert.equal(scan.pages.at(-1).response.data.list,null);assert.equal(scan.details.length,11);assert.deepEqual(scan.details[0].response.data,jobs[0]);assert.equal(scan.details[0].httpStatus,200);assert.equal(scan.details[0].request.url,DETAIL);}
  assert.ok(!JSON.stringify(r).includes('must-not-persist'));assert.ok(!JSON.stringify(r).includes('detailVerified'));
});

test('observed detail otherInfo placeholder stays raw, never becomes JD; unknown content still rejects', async () => {
  // Native detail 2682118682 (2026-10-07): otherInfo is "暂无", list is null.
  const detail={...clone(REAL),otherInfo:'暂无'}, queue=sequence([detail]);
  for(const item of queue) if(item.url===LIST && item.response.data.list) for(const row of item.response.data.list) row.otherInfo=null;
  const r=await m.fetchAll(m.PROFILE,options(queue));
  assert.equal(r.jobs[0].otherInfo,'暂无');
  assert.deepEqual(m.normalizeRecord(r.jobs[0],m.PROFILE),m.normalizeRecord(REAL,m.PROFILE));
  assert.equal(m.validateEvidence(r.verification,r.jobs,m.PROFILE),true);
  for(const value of [' ', '暂无其他要求', '新增正文', {}, 1]) assert.throws(()=>m.validateJobs([{...clone(REAL),otherInfo:value}],m.PROFILE),/otherInfo/);
  const wrongList=sequence([detail]);
  await assert.rejects(m.fetchAll(m.PROFILE,options(wrongList)),/otherInfo/);
  const drift=sequence([detail],[{...clone(detail),otherInfo:null}]);
  for(const item of drift) if(item.url===LIST && item.response.data.list) for(const row of item.response.data.list) row.otherInfo=null;
  await assert.rejects(m.fetchAll(m.PROFILE,options(drift)),/stable/);
});

test('native detail 2936400656 empty otherInfo stays exact raw and does not hide JD or raw drift', async () => {
  const detail={...clone(REAL),otherInfo:''}, queue=sequence([detail]);
  for(const item of queue)if(item.url===LIST&&item.response.data.list)for(const row of item.response.data.list)row.otherInfo=null;
  const raw=await m.fetchAll(m.PROFILE,options(queue));assert.equal(raw.jobs[0].otherInfo,'');assert.deepEqual(m.normalizeRecord(raw.jobs[0],m.PROFILE),m.normalizeRecord(REAL,m.PROFILE));
  const wrongList=sequence([detail]);await assert.rejects(m.fetchAll(m.PROFILE,options(wrongList)),/otherInfo/);
  const drift=clone(raw);drift.verification.scans[1].details[0].response.data.otherInfo='暂无';assert.throws(()=>m.validateEvidence(drift.verification,drift.jobs,m.PROFILE),/stable/);
});

test('HTTP or typed business/shape refusal stops immediately, without retry', async () => {
  const variants=[{httpStatus:403,response:page([listRow()])},{httpStatus:302,response:page([listRow()])},{httpStatus:'200',response:page([listRow()])},
    ...[j=>{j.status='1'},j=>{j.status=0},j=>{j.message='FAIL'},j=>{delete j.status},j=>{j.success=true},j=>{j.data.extraJD=null},j=>{delete j.data.traceId},j=>{j.data.traceId='unknown'},j=>{j.data.page.pageNo='1'},j=>{j.data.page.totalCount='1'},j=>{j.data.page.totalPage=2},j=>{j.data.page.extra=null}].map(f=>{const j=page([listRow()]);f(j);return {response:j}})];
  for(const variant of variants){const calls=[];await assert.rejects(m.fetchAll(m.PROFILE,options([{url:LIST,...variant}],calls)),/Meituan|美团/);assert.equal(calls.length,1);}
});

test('pagination rejects early empty/short/null, total drift, bad echo, array endpoint and duplicate boundary', async () => {
  const eleven=Array.from({length:11},(_,i)=>({...listRow(),jobUnionId:String(4721183269+i)}));
  for(const change of [j=>j.data.list=[],j=>j.data.list=null,j=>j.data.page.pageNo=3,j=>j.data.page.totalCount=12,j=>j.data.page.totalPage=1]) {
    const bad=page(eleven,2);change(bad);const calls=[];await assert.rejects(m.fetchAll(m.PROFILE,options([{url:LIST,response:page(eleven,1)},{url:LIST,response:bad}],calls)),/Meituan|美团/);assert.equal(calls.length,2);
  }
  const badShort=page(eleven,1);badShort.data.list.pop();await assert.rejects(m.fetchAll(m.PROFILE,options([{url:LIST,response:badShort}])),/short|slot|页/);
  const queue=sequence();queue[1].response.data.list=[];await assert.rejects(m.fetchAll(m.PROFILE,options(queue)),/endpoint|null|终点/);
  const repeated=clone(eleven);repeated[10]=clone(repeated[9]);const calls=[];await assert.rejects(m.fetchAll(m.PROFILE,options([{url:LIST,response:page(repeated,1)},{url:LIST,response:page(repeated,2)}],calls)),/Duplicate|重复/);assert.equal(calls.length,2);
});

test('every detail is necessary and bound to requested ID/title/unchangeable list facts', async () => {
  for(const change of [j=>j.data=null,j=>j.data.jobUnionId='999',j=>j.data.name='wrong',j=>j.data.jobDuty+='changed',j=>j.data.jobRequirement+='changed',j=>j.data.highLight+='changed',j=>j.data.jobFamily='changed',j=>j.data.refreshTime++,j=>j.data.cityList[0].name='wrong',j=>j.data.department[0].name='wrong',j=>j.data.extraJD='',j=>delete j.data.departmentIntro,j=>j.status='1']) {
    const queue=sequence(),calls=[];change(queue[2].response);await assert.rejects(m.fetchAll(m.PROFILE,options(queue,calls)),/Meituan|美团/);assert.equal(calls.length,3);
  }
  const queue=sequence(),calls=[];queue[2].httpStatus=403;await assert.rejects(m.fetchAll(m.PROFILE,options(queue,calls)),/HTTP/);assert.equal(calls.length,3);
});

test('full list sets and every native detail field must be stable across two rounds', async () => {
  for(const field of ['departmentIntro','precedence','workYear','firstPostTime','socialRecommendJob']) {
    const changed=clone(REAL);changed[field]=typeof changed[field]==='number'?changed[field]+1:typeof changed[field]==='boolean'?!changed[field]:String(changed[field] ?? '')+'changed';
    await assert.rejects(m.fetchAll(m.PROFILE,options(sequence([REAL],[changed]))),/stable|changed|漂移/);
  }
  const changed={...clone(REAL),jobFamily:'different'};
  await assert.rejects(m.fetchAll(m.PROFILE,options(sequence([REAL],[changed]))),/stable|changed|漂移/);
  const other={...clone(REAL),jobUnionId:'999'};
  await assert.rejects(m.fetchAll(m.PROFILE,options(sequence([REAL],[other]))),/stable|changed|漂移/);
  const recoded=clone(REAL);recoded.cityList[0].code='009001002';
  await assert.rejects(m.fetchAll(m.PROFILE,options(sequence([REAL],[recoded]))),/stable|changed|漂移/);
  // List facts are checked even where detail legitimately enriches a null/empty list value.
  const list=listRow();list.desc=null;await assert.rejects(m.fetchAll(m.PROFILE,options(sequence([REAL],[REAL],[list]))),/stable|changed|漂移/);
});

test('stable native identity/facts tolerate reordered pages, but concrete round-two drift stops before any next request', async () => {
  const jobs=Array.from({length:11},(_,i)=>({...clone(REAL),jobUnionId:String(4721183269+i)}));
  const r=await m.fetchAll(m.PROFILE,options(sequence(jobs,clone(jobs).reverse())));assert.deepEqual(r.jobs,jobs);assert.equal(m.validateEvidence(r.verification,r.jobs,m.PROFILE),true);
  const changedLists=jobs.map(listRow);changedLists[0].desc=null;const listCalls=[];
  await assert.rejects(m.fetchAll(m.PROFILE,options(sequence(jobs,jobs,changedLists),listCalls)),/stable/);assert.equal(listCalls.length,15);
  const changed=clone(jobs);changed[0].departmentIntro+='changed';const detailCalls=[];
  await assert.rejects(m.fetchAll(m.PROFILE,options(sequence(jobs,changed),detailCalls)),/stable/);assert.equal(detailCalls.length,18);
});

test('publisher-style offline evidence revalidation rejects missing/extra envelopes or unbound jobs, not just ready/count flags', async () => {
  const r=await collected();
  for(const change of [v=>delete v.scans,v=>v.scans.pop(),v=>v.api=DETAIL,v=>v.key='meituan',v=>v.ready=true,v=>v.scans[0].details=[],v=>v.scans[0].details.push(clone(v.scans[0].details[0])),v=>v.scans[0].pages.pop(),v=>v.scans[0].pages.push(clone(v.scans[0].pages.at(-1))),v=>v.scans[0].pages[0].httpStatus=403,v=>v.scans[0].pages[0].request.body.specialCode=['1'],v=>v.scans[0].details[0].request.url=LIST,v=>v.scans[0].details[0].request.body.jobUnionId='999',v=>v.scans[0].details[0].request.headers.Cookie='token',v=>delete v.scans[0].details[0].response.message,v=>v.scans[0].details[0].response.data.departmentIntro+='changed']) {
    const evidence=clone(r.verification);change(evidence);assert.throws(()=>m.validateEvidence(evidence,clone(r.jobs),m.PROFILE),/Meituan|美团/);
  }
  const jobs=clone(r.jobs);jobs[0].departmentIntro+='snapshot corruption';assert.throws(()=>m.validateEvidence(r.verification,jobs,m.PROFILE),/snapshot|match|绑定/);
  assert.throws(()=>m.validateEvidence(r.verification,[{...clone(REAL),title:'canonical injection'}],m.PROFILE),/field|shape|字段/);
});

test('effective zero is explicitly unverified; safety limit cannot manufacture completeness', async () => {
  assert.throws(()=>m.validateJobs([],m.PROFILE),/zero|零/);
  const calls=[];await assert.rejects(m.fetchAll(m.PROFILE,options([{url:LIST,response:page([])}],calls)),/zero|零/);assert.equal(calls.length,1);
  const r=await collected();assert.throws(()=>m.validateEvidence(r.verification,[],m.PROFILE),/zero|零/);
  const cap=page([listRow()]);cap.data.page.totalCount=9990;cap.data.page.totalPage=999;
  await assert.rejects(m.fetchAll(m.PROFILE,options([{url:LIST,response:cap}])),/ceiling|limit|触顶/);
  await assert.rejects(m.fetchAll(m.PROFILE,{...options([{url:LIST,response:page([listRow()])}]),maxPages:2}),/ceiling|limit|触顶/);
  for(const limits of [{maxPages:1001},{timeoutMs:0},{delayMs:-1},{fetchImpl:null}])await assert.rejects(m.fetchAll(m.PROFILE,{...options([]),...limits}),/limit|request|限制/);
});

test('15s-or-tighter native abort signal and thrown transport errors stop without retry', async () => {
  let calls=0;
  await assert.rejects(m.fetchAll(m.PROFILE,{sleep:async()=>{},timeoutMs:1,fetchImpl:async(_,init)=>{
    calls++;return new Promise((_,reject)=>{const hold=setTimeout(()=>reject(new Error('Missing timeout')),100);init.signal.addEventListener('abort',()=>{clearTimeout(hold);reject(init.signal.reason)},{once:true});});
  }}),/timeout|aborted/i);assert.equal(calls,1);
  const recorded=[];await assert.rejects(m.fetchAll(m.PROFILE,options([{url:LIST,error:new Error('transport stopped')}],recorded)),/transport stopped/);assert.equal(recorded.length,1);
  const json=[];await assert.rejects(m.fetchAll(m.PROFILE,options([{url:LIST,jsonError:new SyntaxError('BODY SECRET must not enter error logs')}],json)),error=>error.message==='Meituan: invalid native JSON response');assert.equal(json.length,1);
});

test('production run writes usable atomic envelope; first-request failure never creates a candidate', async t => {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ande-meituan-offline-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));const file=path.join(dir,'raw.json');
  const bad=()=>options([{url:LIST,httpStatus:403,response:page([listRow()])}]);
  await assert.rejects(m.run([JSON.stringify(m.PROFILE),file],bad()),/HTTP/);assert.equal(fs.existsSync(file),false);assert.deepEqual(fs.readdirSync(dir),[]);
  fs.writeFileSync(file,'OLD\n');const before=fs.statSync(file,{bigint:true});
  await assert.rejects(m.run([JSON.stringify(m.PROFILE),file],bad()),/HTTP/);assert.equal(fs.readFileSync(file,'utf8'),'OLD\n');assert.equal(fs.statSync(file,{bigint:true}).mtimeNs,before.mtimeNs);assert.deepEqual(fs.readdirSync(dir),['raw.json']);
  // A disk error AFTER creating/writing the owned temporary file must remove it, not the prior candidate.
  const write=fs.writeFileSync;
  fs.writeFileSync=(fd,...rest)=>{if(typeof fd==='number'){write(fd,'PARTIAL');throw new Error('Simulated disk full');}return write(fd,...rest);};
  try { await assert.rejects(m.run([JSON.stringify(m.PROFILE),file],options(sequence())),/disk full/); }
  finally { fs.writeFileSync=write; }
  assert.equal(fs.readFileSync(file,'utf8'),'OLD\n');assert.deepEqual(fs.readdirSync(dir),['raw.json']);
  const r=await m.run([JSON.stringify(m.PROFILE),file],options(sequence()));assert.deepEqual(JSON.parse(fs.readFileSync(file,'utf8')),r);assert.equal(r.complete,false);assert.equal(m.validateEvidence(r.verification,r.jobs,m.PROFILE).total,1);assert.deepEqual(fs.readdirSync(dir),['raw.json']);
  await assert.rejects(m.run([JSON.stringify(m.PROFILE)],bad()),/Usage|output|用法/);
});

test('sole crawl/snapshot/publisher chain rechecks complete evidence and retains non-target facts', async t => {
  const {runCrawl,adapterCommand}=require('../crawler/crawl'),{publish,normalizeJobs}=require('../crawler/publish');
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ande-meituan-chain-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const native={...clone(REAL),jobDuty:'  ',jobRequirement:'要求保空白  '},envelope=await collected([native]);
  const times=['2026-01-01T00:00:00.000Z','2026-01-01T00:00:01.000Z'];
  const result=runCrawl(m.PROFILE,{outDir:dir,now:()=>times.shift(),runner:(_,args)=>{assert.equal(args[1],JSON.stringify(m.PROFILE));fs.writeFileSync(args[2],JSON.stringify(envelope));return {status:0};}});
  assert.equal(result.code,0);assert.equal(result.lastSuccess,'2026-01-01T00:00:01.000Z');assert.equal(adapterCommand(m.PROFILE,'x').timeout,2400000);
  const snapshot=JSON.parse(fs.readFileSync(path.join(dir,'meituan_social_snapshot.json'),'utf8'));assert.deepEqual(snapshot.verification,envelope.verification);
  const projected=normalizeJobs(snapshot.jobs,m.PROFILE)[0];assert.equal(projected.duty,'  ');assert.equal(projected.requirements,'要求保空白  ');assert.equal(projected.description,m.normalizeRecord(native,m.PROFILE).description);
  const retained={...projected,id:'other:1',sourceKey:'other',company:'其它单位',description:'原正文',duty:'原职责',requirements:'原要求',date:'2020-01-01',dateKind:'published'};
  const oldSource={key:'other',company:'其它单位',status:'ready',lastSuccess:'2020-01-01T00:00:00Z',lastAttempt:'2020-01-01T00:00:00Z',message:'原状态',coverage:'原覆盖'};
  const company={name:'其它单位',initial:'Q',aliases:['原别名']},dataFile=path.join(dir,'data.js');
  fs.writeFileSync(dataFile,'globalThis.ANDE_DATA = '+JSON.stringify({version:1,legacy:false,notices:[],companies:[company],sources:[oldSource],jobs:[retained]})+';\n');
  const published=publish({outDir:dir,dataFile,sites:[m.PROFILE],keys:[m.PROFILE.key]});assert.equal(published.code,0);assert.deepEqual(published.updated,[m.PROFILE.key]);assert.deepEqual(published.data.jobs.find(j=>j.sourceKey==='other'),retained);assert.deepEqual(published.data.sources.find(s=>s.key==='other'),oldSource);assert.deepEqual(published.data.companies[0],company);
  const before=fs.readFileSync(dataFile),bad=clone(snapshot);bad.verification.scans[1].details[0].response.data.departmentIntro+='漂移';fs.writeFileSync(path.join(dir,'meituan_social_snapshot.json'),JSON.stringify(bad));
  const rejected=publish({outDir:dir,dataFile,sites:[m.PROFILE],keys:[m.PROFILE.key]});assert.equal(rejected.written,false);assert.equal(rejected.code,1);assert.deepEqual(fs.readFileSync(dataFile),before);
  for(const site of [{...clone(m.PROFILE),adapter:undefined},{...clone(m.PROFILE),ats:'moka',orgId:'x',siteId:1},{...clone(m.PROFILE),key:'other',api:'https://ZHAOPIN.MEITUAN.COM:443/api'}]){assert.equal(adapterCommand(site,'x'),null);assert.throws(()=>normalizeJobs([],site),/not been verified|unverified/i);}
});

test('crawl rejects missing/raw-spoofed native evidence and restores last complete bytes', async t => {
  const {runCrawl}=require('../crawler/crawl');const envelope=await collected();
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ande-meituan-restore-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const raw=path.join(dir,'meituan_social_raw.json'),snapshot=path.join(dir,'meituan_social_snapshot.json');fs.writeFileSync(raw,'PRIOR RAW');fs.writeFileSync(snapshot,'PRIOR SNAPSHOT');
  for(const bad of [{complete:true,total:1,jobs:clone(envelope.jobs)},{...clone(envelope),jobs:[{...clone(REAL),departmentIntro:'未绑定全文'}]}]){
    const result=runCrawl(m.PROFILE,{outDir:dir,now:()=> '2026-01-01T00:00:00Z',runner:(_,args)=>{fs.writeFileSync(args[2],JSON.stringify(bad));return {status:0};}});assert.equal(result.code,1);assert.equal(fs.readFileSync(raw,'utf8'),'PRIOR RAW');assert.equal(fs.readFileSync(snapshot,'utf8'),'PRIOR SNAPSHOT');
  }
});
