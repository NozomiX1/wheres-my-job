'use strict';
const fs = require('node:fs');
const {randomUUID} = require('node:crypto');
const {isDeepStrictEqual: equal} = require('node:util');

const ORIGIN = 'https://zhaopin.meituan.com';
const LIST_API = ORIGIN + '/api/official/job/getJobList';
const DETAIL_API = ORIGIN + '/api/official/job/getJobDetail';
const HEADERS = Object.freeze({'Content-Type':'application/json',Accept:'application/json'});
const MAX_PAGES = 1000, PAGE_SIZE = 10;
const PORTAL_NOTICE = '美团来源仅覆盖官网当前默认全部社招入口，不代表公司所有招聘渠道；六片完整JD按真实文本顺序展示，独立职责/岗位基本要求用于排序，其余片段不另加字段分。性质、人才计划、职能映射及可靠官网日期未知；官网原状态码不证明实际可投性。';
function portalNotice(site) { return verifiedSource(site) ? PORTAL_NOTICE : ''; }
function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
// Fixed protocol/scope identity, not a claim of successful production collection.
const PROFILE = freeze({
  key:'meituan_social',company:'美团',ats:'custom',adapter:'meituan-portal-v1',track:'social',batch:'社招',exclude:'(无)',
  apiOrigin:ORIGIN,url:ORIGIN+'/web/social',api:LIST_API,fetchDetails:true,
  body:{page:{pageNo:1,pageSize:10},jobShareType:'1',keywords:'',cityList:[],department:[],jfJgList:[],jobType:[{code:'3',subCode:[]}],typeCode:[],specialCode:[]}
});
const FIELDS = 'jobUnionId name projectId projectName jobType jobSpecialCode jobSource jobStatus jobFamily jobFamilyGroup cityList workYear department desc departmentIntro jobDuty jobRequirement precedence highLight otherInfo firstPostTime refreshTime tag expiredTime socialRecommendJob'.split(' ');
const LABEL_FIELDS = 'code name children sort subCode mapping outerCode bgNode'.split(' ');
const SECTIONS = [['departmentIntro','部门介绍'],['desc','岗位描述'],['jobDuty','岗位职责'],['jobRequirement','岗位基本要求'],['precedence','具备以下条件优先'],['highLight','岗位亮点']];
const check = (ok, message) => { if (!ok) throw new Error('Meituan: '+message); };
function shape(value, fields, label) {
  check(value && typeof value==='object' && !Array.isArray(value) && [Object.prototype,null].includes(Object.getPrototypeOf(value)),label+' object shape');
  const keys = Reflect.ownKeys(value);
  check(keys.length===fields.length && fields.every(k=>Object.hasOwn(value,k)) && keys.every(k=>typeof k==='string' && fields.includes(k)),label+' fields');
  check(keys.every(k=>Object.hasOwn(Object.getOwnPropertyDescriptor(value,k),'value')),label+' data fields');
}
function array(value, label) {
  check(Array.isArray(value) && Object.getPrototypeOf(value)===Array.prototype && Reflect.ownKeys(value).length===value.length+1,label+' array shape');
  for (let i=0;i<value.length;i++) check(Object.hasOwn(value,i),label+' sparse array');
}
function uri(value) {
  check(typeof value==='string' && /^https?:\/\/[^/]/i.test(value) && !/[\u0000-\u0020\u007f\\]/.test(value) && !/%(?![0-9a-f]{2})/i.test(value),'invalid URI');
  return new URL(value);
}
function requiresVerification(site) {
  if (!site || typeof site!=='object') return false;
  if (['meituan','meituan_social'].includes(site.key) || site.adapter===PROFILE.adapter) return true;
  for (const field of ['apiOrigin','origin','api','url','detailApi']) {
    if (!Object.hasOwn(site,field)) continue;
    try { const u=uri(site[field]); if (u.username || u.password || u.hostname.toLowerCase().replace(/\.$/,'')==='zhaopin.meituan.com') return true; }
    catch { return true; } // An invalid declared URI never falls through to generic parsing.
  }
  return false;
}
function verifiedSource(site) {
  try {
    shape(site,Object.keys(PROFILE),'source');
    return Object.keys(PROFILE).every(k=>['apiOrigin','api','url'].includes(k) ? uri(site[k]).href===uri(PROFILE[k]).href : equal(site[k],PROFILE[k]));
  } catch { return false; }
}
function source(site) { check(verifiedSource(site),'unverified Meituan source identity/scope/mode'); }
function labels(values, label, mode, track='social') {
  if (track==='campus' && label==='city' && values===null) return; // Real 4697281262: absent in list/detail and renderer.
  array(values,label);
  for (const v of values) {
    shape(v,LABEL_FIELDS,label+' label');
    check(typeof v.name==='string' && v.name.trim().length>0,label+' own name');
    check(v.code===null || (label==='city'||track==='campus') && mode==='detail' && typeof v.code==='string' && v.code.trim().length>0,label+' unknown nonnull code');
    check(typeof v.bgNode==='boolean',label+' bgNode');
    for (const k of ['children','sort','subCode','mapping','outerCode']) check(v[k]===null,label+' unknown nonnull '+k);
  }
}
function record(job, mode='detail', track='social') {
  shape(job,FIELDS,'native job');
  check(typeof job.jobUnionId==='string' && /^[1-9]\d*$/.test(job.jobUnionId),'native jobUnionId string');
  check(typeof job.name==='string' && job.name.trim().length>0,'native name');
  check(['social','campus'].includes(track),'unknown native track');
  if (track==='social') {
    for (const [k,v] of Object.entries({jobType:'3',jobSpecialCode:'5',jobSource:'1',jobStatus:'000'})) check(job[k]===v,'social native '+k);
    check(job.tag===null,'unknown nonnull native field tag');
  } else {
    check(['1','2'].includes(job.jobType) && typeof job.jobSpecialCode==='string' && /^[1-9]\d*$/.test(job.jobSpecialCode) && ['1','2'].includes(job.jobSource) && job.jobStatus==='000','campus native type/source/status codes');
    if (job.tag!==null) { array(job.tag,'native campus tag'); check(job.tag.every(v=>v===0||v===1),'unknown campus tag value'); }
  }
  if (track==='social' || mode==='list') for (const k of ['projectId','projectName']) check(job[k]===null,'unknown nonnull native field '+k);
  else check(job.projectId===null && job.projectName===null || typeof job.projectId==='string' && /^[1-9]\d*$/.test(job.projectId) && typeof job.projectName==='string' && job.projectName.trim().length>0,'campus detail project metadata');
  // Observed detail-only placeholder; the official six-section renderer does not display it.
  // Keep its raw value and stability checks; arbitrary new content remains unverified.
  check(job.otherInfo===null || mode==='detail' && ['', '暂无'].includes(job.otherInfo),'unknown nonnull native field otherInfo');
  for (const k of ['jobFamily','jobFamilyGroup']) check(typeof job[k]==='string' && job[k].trim().length>0,'native text field '+k);
  for (const k of ['workYear',...SECTIONS.map(s=>s[0])]) check(job[k]===null || typeof job[k]==='string','native text field '+k);
  for (const k of ['firstPostTime','refreshTime','expiredTime']) check(job[k]===null || Number.isSafeInteger(job[k]) && job[k]>0,'native timestamp field '+k);
  check(job.socialRecommendJob===null || typeof job.socialRecommendJob==='boolean','native socialRecommendJob');
  if (mode==='list') for (const k of ['workYear','firstPostTime','socialRecommendJob']) check(job[k]===null,'unknown nonnull list field '+k);
  labels(job.cityList,'city',mode,track); labels(job.department,'department',mode,track);
  return job;
}
function validateJobs(jobs, site) {
  source(site); array(jobs,'jobs');
  check(jobs.length>0,'effective zero has not been verified');
  const seen = new Set();
  for (const job of jobs) { record(job); check(!seen.has(job.jobUnionId),'Duplicate native identity '+job.jobUnionId); seen.add(job.jobUnionId); }
  return true;
}
function normalizeRecord(job, site) {
  source(site); record(job);
  return {
    id:job.jobUnionId,title:job.name,city:job.cityList.map(v=>v.name),category:'',
    description:SECTIONS.filter(([k])=>job[k]!==null && job[k]!=='').map(([k,title])=>title+'\n'+job[k]).join('\n\n'),
    duty:job.jobDuty ?? '',requirements:job.jobRequirement ?? '',
    date:null,dateKind:null,employment:null,talentPlan:null,channels:['social'],sourceStatus:job.jobStatus,
    jdComplete:SECTIONS.some(([k])=>/[\p{L}\p{N}]/u.test(job[k] ?? '')),
    url:ORIGIN+'/web/position/detail?jobUnionId='+encodeURIComponent(job.jobUnionId)+'&jobShareType=1'
  };
}
function request(url, body) { return {url,method:'POST',headers:{...HEADERS},body}; }
function listRequest(n) {
  const body = structuredClone(PROFILE.body); body.page.pageNo=n;
  return request(LIST_API,body);
}
function detailRequest(id) { return request(DETAIL_API,{jobUnionId:id,jobShareType:'1'}); }
function response(raw, expectedRequest) {
  shape(raw,['request','httpStatus','response'],'raw envelope');
  check(equal(raw.request,expectedRequest),'raw request binding');
  check(raw.httpStatus===200,'HTTP status');
  shape(raw.response,['data','status','message'],'native response');
  check(raw.response.status===1 && raw.response.message==='成功','native business status/message');
  return raw.response.data;
}
function consumePage(raw, n, state, maxPages=MAX_PAGES) {
  const data = response(raw,listRequest(n));
  shape(data,['list','page','traceId'],'native list data');
  check(data.traceId===null,'unknown traceId field');
  const p = data.page;
  shape(p,['pageNo','pageSize','totalCount','totalPage'],'native page');
  check(Number.isSafeInteger(p.pageNo) && p.pageNo===n && p.pageSize===PAGE_SIZE,'native page echo');
  check(Number.isSafeInteger(p.totalCount) && p.totalCount>=0 && Number.isSafeInteger(p.totalPage) && p.totalPage>=0,'native page totals types');
  check(p.totalCount>0,'effective zero has not been verified');
  check(p.totalPage===Math.ceil(p.totalCount/PAGE_SIZE),'native page total mismatch');
  check(p.totalPage+1<maxPages,'page safety ceiling reached (1000 is not success)');
  if (state.total===null) { state.total=p.totalCount; state.totalPage=p.totalPage; }
  check(state.total===p.totalCount && state.totalPage===p.totalPage,'native totals changed');
  if (n===state.totalPage+1) {
    check(data.list===null,'native beyond-end endpoint must be typed null');
    check(state.rows.length===state.total,'native total count mismatch');
    return true;
  }
  check(n<=state.totalPage,'unexpected page after endpoint'); array(data.list,'native list');
  check(data.list.length===Math.min(PAGE_SIZE,state.total-(n-1)*PAGE_SIZE),'early empty/short page slots');
  for (const row of data.list) {
    record(row,'list'); check(!state.byId.has(row.jobUnionId),'Duplicate native identity '+row.jobUnionId);
    state.rows.push(row); state.byId.set(row.jobUnionId,row);
  }
  return false;
}
function consumeDetail(raw, listed, track='social') {
  const detail = record(response(raw,detailRequest(listed.jobUnionId)),'detail',track);
  for (const k of ['jobUnionId','name','jobType','jobSpecialCode','jobSource','jobStatus','jobFamily','jobFamilyGroup','refreshTime','expiredTime','tag']) check(equal(detail[k],listed[k]),'list/detail binding '+k);
  if (track==='social' || listed.projectId!==null || listed.projectName!==null) for (const k of ['projectId','projectName']) check(equal(detail[k],listed[k]),'list/detail binding '+k);
  check(equal(detail.otherInfo,listed.otherInfo) || listed.otherInfo===null && ['', '暂无'].includes(detail.otherInfo),'list/detail binding otherInfo');
  for (const k of ['cityList','department']) {
    if (track==='campus' && k==='cityList' && listed[k]===null) { check(detail[k]===null,'null campus city binding'); continue; }
    const withoutCode = values=>values.map(({code,...rest})=>rest);
    check(track==='campus' && k==='department' && listed[k].length===0 || equal(withoutCode(detail[k]),withoutCode(listed[k])),'list/detail labels binding '+k);
  }
  for (const k of ['jobDuty','jobRequirement','highLight']) check((detail[k] ?? '')===(listed[k] ?? ''),'list/detail binding '+k);
  // These visible fields are known to be absent from lists but present in full details.
  for (const k of ['desc','departmentIntro','precedence']) if (listed[k]!==null && listed[k]!=='') check(detail[k]===listed[k],'list/detail binding '+k);
  return detail;
}
function newState() { return {total:null,totalPage:null,rows:[],byId:new Map()}; }
function facts(rows) { return new Map(rows.map(row=>[row.jobUnionId,row])); }
function validateEvidence(evidence, jobs, site) {
  validateJobs(jobs,site);
  shape(evidence,['version','key','api','detailApi','scans'],'verification');
  check(evidence.version===1 && evidence.key===PROFILE.key && evidence.api===LIST_API && evidence.detailApi===DETAIL_API,'verification source binding');
  array(evidence.scans,'scans'); check(evidence.scans.length===2,'two complete scans required');
  const states=[], details=[];
  for (const scan of evidence.scans) {
    shape(scan,['pages','details'],'scan'); array(scan.pages,'pages'); array(scan.details,'details');
    check(scan.pages.length>1 && scan.pages.length<MAX_PAGES,'page safety ceiling / missing endpoint');
    const state=newState(); let ended=false;
    for (let i=0;i<scan.pages.length;i++) {
      check(!ended,'extra page after endpoint'); ended=consumePage(scan.pages[i],i+1,state);
    }
    check(ended,'missing native endpoint'); check(scan.details.length===state.total,'missing/extra full details');
    const full=scan.details.map((raw,i)=>consumeDetail(raw,state.rows[i]));
    validateJobs(full,site); states.push(state); details.push(full);
  }
  check(equal(states[0].byId,states[1].byId),'full native list set/facts not stable');
  check(equal(facts(details[0]),facts(details[1])),'full native details/JD not stable');
  check(equal(jobs,details[0]),'snapshot jobs do not match bound full raw details');
  return true;
}
async function fetchAll(site, options={}) {
  source(site);
  const {fetchImpl=globalThis.fetch,sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms)),delayMs=200,timeoutMs=15000,maxPages=MAX_PAGES}=options;
  check(typeof fetchImpl==='function' && typeof sleep==='function' && Number.isFinite(delayMs) && delayMs>=0 && Number.isSafeInteger(timeoutMs) && timeoutMs>0 && Number.isSafeInteger(maxPages) && maxPages>1 && maxPages<=MAX_PAGES,'invalid request limits');
  async function get(req) {
    await sleep(Math.max(200,delayMs));
    const r=await fetchImpl(req.url,{method:req.method,headers:req.headers,body:JSON.stringify(req.body),redirect:'manual',signal:AbortSignal.timeout(Math.min(15000,timeoutMs))});
    check(r && r.status===200,'HTTP status');
    let payload;
    try { payload=await r.json(); }
    catch (error) { if (error instanceof SyntaxError) throw new Error('Meituan: invalid native JSON response'); throw error; }
    return {request:req,httpStatus:r.status,response:payload};
  }
  const verification={version:1,key:PROFILE.key,api:LIST_API,detailApi:DETAIL_API,scans:[]};
  let firstLists; const firstDetails=new Map();
  for (let round=0;round<2;round++) {
    if (round) await sleep(15000);
    const scan={pages:[],details:[]},state=newState(); let ended=false;
    for (let n=1;n<maxPages;n++) {
      const raw=await get(listRequest(n)); ended=consumePage(raw,n,state,maxPages); scan.pages.push(raw);
      if (round) {
        check(state.total===firstLists.size,'full native list total not stable');
        if (!ended) for (const row of raw.response.data.list) check(equal(row,firstLists.get(row.jobUnionId)),'full native list set/facts not stable');
      }
      if (ended) break;
    }
    check(ended,'page safety ceiling / incomplete endpoint');
    if (!round) firstLists=state.byId;
    for (const listed of state.rows) {
      const raw=await get(detailRequest(listed.jobUnionId)),full=consumeDetail(raw,listed);
      if (round) check(equal(full,firstDetails.get(listed.jobUnionId)),'full native details/JD not stable');
      else firstDetails.set(listed.jobUnionId,full);
      scan.details.push(raw);
    }
    verification.scans.push(scan);
  }
  const jobs=verification.scans[0].details.map(raw=>raw.response.data);
  validateEvidence(verification,jobs,site);
  return {complete:true,total:jobs.length,jobs,verification};
}
async function run(args, options={}) {
  check(Array.isArray(args) && args.length===2 && typeof args[0]==='string' && typeof args[1]==='string' && args[1].length>0,'Usage: meituan_portal.js <siteJSON> <outputFile>');
  const site=JSON.parse(args[0]); source(site);
  const result=await fetchAll(site,options);
  const envelope={key:site.key,api:site.api,mode:'custom',...result};
  const file=args[1],temporary=file+'.tmp-'+randomUUID(); let created=false;
  try {
    const fd=fs.openSync(temporary,'wx'); created=true;
    try { fs.writeFileSync(fd,JSON.stringify(envelope,null,2)+'\n','utf8'); }
    finally { fs.closeSync(fd); }
    fs.renameSync(temporary,file);
  } finally { if (created && fs.existsSync(temporary)) fs.unlinkSync(temporary); }
  return envelope;
}
// Shared native parsers; scope/qualification remains in each fixed-profile collector.
module.exports={PROFILE,PORTAL_NOTICE,portalNotice,requiresVerification,verifiedSource,validateJobs,normalizeRecord,validateEvidence,fetchAll,run,protocol:{shape,array,check,record,request,response,consumeDetail,detailRequest,labels,SECTIONS}};
if (require.main===module) run(process.argv.slice(2)).catch(error=>{console.error(error.message);process.exitCode=1;});
