'use strict';
const fs=require('node:fs');
const {isDeepStrictEqual:equal}=require('node:util');
const http=require('./huawei_http');
const {htmlText}=require('../jd-text');
const ADAPTER='huawei-portal-v1',MAX_PAGES=200;
const PROFILES=Object.freeze([['huawei','campus'],['huawei_social','social']].map(([key,track])=>Object.freeze({
  key,company:'华为',ats:'custom',adapter:ADAPTER,track,batch:track==='campus'?'校园招聘':'社招',exclude:'(无)',
  origin:http.ORIGIN,url:http.ORIGIN+'/cn/'+(track==='campus'?'campus':'social')+'-recruitment-job-list',api:http.API,
  detailApi:http.requests.detail(1).url,fetchDetails:true,body:Object.freeze({curPage:1,pageSize:10,jobType:http.TYPES[key]})
})));
const check=(ok,message)=>{if(!ok)throw new Error('Huawei: '+message);};
const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
const positive=v=>Number.isSafeInteger(v)&&v>0;
const string=v=>typeof v==='string';
function requiresVerification(site){
  if(PROFILES.some(p=>p.key===site?.key)||site?.adapter===ADAPTER)return true;
  return ['url','origin','api','detailApi'].some(k=>{try{return ['career.huawei.com','apigw-dgg-b0.huawei.com'].includes(new URL(site?.[k]).hostname);}catch{return false;}});
}
function verifiedSource(site){return PROFILES.some(p=>equal(p,site));}
function profile(site){check(verifiedSource(site),'unverified source identity/scope');return PROFILES.find(p=>p.key===site.key);}
function native(raw,request){
  check(object(raw)&&equal(raw.request,request)&&raw.httpStatus===200,'request/HTTP binding');
  const r=raw.response;check(object(r)&&r.status==='SUCCESS'&&r.errors===null&&r.data!=null,'native business/shape refusal');return r.data;
}
function listed(row){
  check(object(row)&&positive(row.advertisementId)&&positive(row.jobId)&&string(row.jobName)&&row.jobName.trim(),'invalid list identity/title');
  for(const k of ['mainBusiness','jobRequire','workPlace','categoryName'])check(Object.hasOwn(row,k)&&(row[k]===null||string(row[k])),'invalid list '+k);
  return row;
}
function detailed(row,list,p){
  check(object(row)&&row.advertisementId===list.advertisementId&&row.jobId===list.jobId&&row.recruitType===http.TYPES[p.key]&&string(row.jobname)&&row.jobname.trim(),'detail identity/scope');
  for(const k of ['mainBusiness','jobRequire','jobCity','categoryName'])check(Object.hasOwn(row,k)&&(row[k]===null||string(row[k])),'invalid detail '+k);
  return row;
}
function intentions(rows,jobId){
  check(Array.isArray(rows),'intentions array');const ids=new Set();
  for(const row of rows){
    check(object(row)&&positive(row.positionIntentionId)&&!ids.has(row.positionIntentionId)&&row.jobId===jobId&&string(row.positionIntention)&&row.positionIntention.trim(),'intention identity');
    ids.add(row.positionIntentionId);
    for(const k of ['jobResponsibilities','jobDemand'])check(Object.hasOwn(row,k)&&(row[k]===null||string(row[k])),'invalid intention '+k);
  }
  return rows;
}
function validateJobs(jobs,site){
  const p=profile(site);check(Array.isArray(jobs)&&jobs.length>0,'no usable data; zero cannot clear old jobs');const ids=new Set();
  for(const row of jobs){listed(row.listed);check(!ids.has(row.listed.advertisementId),'duplicate official id');ids.add(row.listed.advertisementId);
    check(row.detail===null||object(row.detail),'invalid detail slot');if(row.detail)detailed(row.detail,row.listed,p);
    check(row.intentions===null||Array.isArray(row.intentions),'invalid intentions slot');if(row.intentions!==null)intentions(row.intentions,row.listed.jobId);
  }return true;
}
function collectAvailable(site,pages,details=[],intentionPages=[],issues=[]){
  const p=profile(site);check(Array.isArray(pages)&&pages.length>0&&pages.length<MAX_PAGES&&Array.isArray(details)&&Array.isArray(intentionPages)&&Array.isArray(issues)&&issues.every(string),'evidence arrays');
  const rows=new Map(),totals=new Set(),notes=new Set(issues);let duplicates=0;
  pages.forEach((raw,index)=>{
    const d=native(raw,http.requests.page(p.key,index+1)),v=d.pageVO;
    check(object(v)&&v.curPage===index+1&&v.pageSize===10&&Number.isSafeInteger(v.totalRows)&&v.totalRows>=0&&Array.isArray(d.result),'list/page metadata');totals.add(v.totalRows);
    for(const item of d.result){try{listed(item);if(rows.has(item.advertisementId))duplicates++;rows.set(item.advertisementId,{listed:item,detail:null,intentions:null});}catch(error){notes.add('列表记录未应用：'+error.message);}}
  });
  for(const raw of details){const id=Number(raw.request?.body?.advertisementId),row=rows.get(id);
    check(row,'detail not bound to listed identity');try{row.detail=detailed(native(raw,http.requests.detail(id)),row.listed,p);}catch(error){notes.add('详情未应用 '+id+'：'+error.message);}
  }
  for(const raw of intentionPages){const id=raw.request?.body?.jobId,matched=[...rows.values()].filter(r=>r.listed.jobId===id);
    check(matched.length>0,'intentions not bound to listed jobId');try{const values=intentions(native(raw,http.requests.intentions(id)),id);for(const row of matched)row.intentions=values;}catch(error){notes.add('岗位意向未应用 '+id+'：'+error.message);}
  }
  check(rows.size>0,'no usable records; zero cannot clear old jobs');
  if(duplicates)notes.add('列表重复身份 '+duplicates+' 次，按官方advertisementId保留最后记录');
  if(totals.size!==1||!totals.has(rows.size))notes.add('官方total '+[...totals].join('→')+'；实际唯一岗位 '+rows.size);
  const jobs=[...rows.values()],missing=jobs.filter(r=>!r.detail||r.intentions===null).length;
  if(missing)notes.add('详情/岗位意向未齐 '+missing+' 岗；完整性待补');
  const verification={version:1,key:p.key,api:p.api,policy:'available',pages,details,intentionPages,issues};
  return {complete:false,total:jobs.length,jobs,verification,issues:[...notes]};
}
function validateEvidence(evidence,jobs,site){
  const p=profile(site);check(object(evidence)&&evidence.version===1&&evidence.key===p.key&&evidence.api===p.api&&evidence.policy==='available','verification identity/policy');
  const result=collectAvailable(p,evidence.pages,evidence.details,evidence.intentionPages,evidence.issues);
  check(equal(jobs,result.jobs),'jobs/native binding');validateJobs(jobs,p);return result;
}
const placeholder=v=>/^请您详见岗位意向中的岗位(?:职责|要求)$/.test((v||'').trim());
function body(value){return placeholder(value)?'':htmlText(value);}
function normalizeRecord(row,site){
  const p=profile(site);validateJobs([row],p);const l=row.listed,d=row.detail;
  const directions=row.intentions?.length?row.intentions:[];
  const fallbackDuty=body(d?.mainBusiness)||body(l.mainBusiness),fallbackRequirements=body(d?.jobRequire)||body(l.jobRequire);
  let duty=fallbackDuty,requirements=fallbackRequirements,description='';
  if(directions.length){
    duty=directions.map(i=>body(i.jobResponsibilities)).join('\n');requirements=directions.map(i=>body(i.jobDemand)).join('\n');
    description=directions.map(i=>[i.positionIntention,'岗位职责',body(i.jobResponsibilities),'岗位要求',body(i.jobDemand)].join('\n')).join('\n\n');
    if(!duty.trim()&&fallbackDuty){duty=fallbackDuty;description+='\n\n岗位职责\n'+fallbackDuty;}
    if(!requirements.trim()&&fallbackRequirements){requirements=fallbackRequirements;description+='\n\n岗位要求\n'+fallbackRequirements;}
  }
  // A full source is never inferred from finished requests. Keep unknown metadata/extra sections honest.
  const part=row.split?row.intentions[0]:null; // 拆分后的单个岗位意向：标题带意向名，地点用该意向自己的，ID 加意向号
  return {id:part?l.advertisementId+'-'+part.positionIntentionId:String(l.advertisementId),title:(d?d.jobname:l.jobName)+(part?'（'+part.positionIntention.trim()+'）':''),city:(part&&string(part.jobPlaceName)&&part.jobPlaceName.trim())||(d?d.jobCity:l.workPlace)||'',category:(d?d.categoryName:l.categoryName)||'',
    channels:[p.track],employment:null,talentPlan:null,date:null,dateKind:null,sourceStatus:null,
    url:http.ORIGIN+'/cn/job-details?advertisementId='+l.advertisementId,duty,requirements,description,
    jdComplete:false};
}
function portalNotice(site){if(!verifiedSource(site))return '';return '华为仅覆盖登记官网默认'+(site.track==='campus'?'校招CR':'社招SR')+'列表，不按项目或职位方向删岗；非集团全球所有渠道。已取得详情及岗位意向正文按原顺序保留；额外正文完整性未核验，日期/性质/人才计划未知，不以接口列出证明实际可投。';}
async function fetchAvailable(site,options={}){
  const p=profile(site),maxPages=options.maxPages??MAX_PAGES,known=options.known??require('../known').knownIds();check(Number.isSafeInteger(maxPages)&&maxPages>1&&maxPages<=MAX_PAGES,'invalid page safety limit');
  const pages=options.listPages??[],details=[],intentionPages=[],issues=[];let stopped=false;
  if(pages.length){collectAvailable(p,pages);issues.push('复用已取得列表，仅续取详情/岗位意向；本次未重采列表');}
  const page=await http.open(p.key,options);
  if(!pages.length)for(let n=1;n<maxPages;n++){
    try{const response=await page(n),raw={request:http.requests.page(p.key,n),httpStatus:200,response};const data=response.data;
      check(object(data.pageVO)&&data.pageVO.curPage===n&&data.pageVO.pageSize===10&&Number.isSafeInteger(data.pageVO.totalRows)&&data.pageVO.totalRows>=0&&Array.isArray(data.result),'list/page metadata');pages.push(raw);
      if(!data.result.length||(Number.isSafeInteger(data.pageVO.totalPages)&&n>=data.pageVO.totalPages))break;
      if(n===maxPages-1)issues.push('达到分页安全上限，覆盖待补');
    }catch(error){if(!pages.length)throw error;issues.push('请求停止：'+error.message);stopped=true;break;}
  }
  const jobs=collectAvailable(p,pages).jobs,seen=new Set();
  let reused=0;
  if(!stopped)for(const row of jobs){if(known.has(String(row.listed.advertisementId))){reused++;continue;}try{ // 增量：已发布且有详情，沿用
    const response=await page.detail(row.listed.advertisementId);details.push({request:http.requests.detail(row.listed.advertisementId),httpStatus:200,response});
    // Request only intentions of the same listed/detail identity; malformed details do not authorize another ID.
    detailed(response.data,row.listed,p);
    if(!seen.has(row.listed.jobId)){seen.add(row.listed.jobId);intentionPages.push({request:http.requests.intentions(row.listed.jobId),httpStatus:200,response:await page.intentions(row.listed.jobId)});}
  }catch(error){issues.push('请求停止，剩余详情/意向待补：'+error.message);break;}}
  if(reused)console.log('增量：沿用已发布详情 '+reused+' 个，新取详情 '+details.length+' 个');
  return collectAvailable(p,pages,details,intentionPages,issues);
}
async function run(args,options={}){
  check(Array.isArray(args)&&[2,3].includes(args.length)&&string(args[0])&&string(args[1])&&args[1],'Usage: huawei_portal.js <siteJSON> <rawFile> [--resume-details=<snapshot>]');
  const site=JSON.parse(args[0]);profile(site);
  if(args[2]){
    check(args[2].startsWith('--resume-details='),'unknown argument');
    const seed=JSON.parse(fs.readFileSync(args[2].slice('--resume-details='.length),'utf8'));
    check(seed.key===site.key,'resume source identity');validateEvidence(seed.verification,seed.jobs,site);
    options={...options,listPages:seed.verification.pages};
  }
  const result=await fetchAvailable(site,options),temp=args[1]+'.'+process.pid+'.tmp';
  try{fs.writeFileSync(temp,JSON.stringify(result,null,2)+'\n','utf8');fs.renameSync(temp,args[1]);}finally{if(fs.existsSync(temp))fs.unlinkSync(temp);}return result;
}
// 官网一个岗位可含多个“岗位意向”（候选人先选意向才看到对应职责要求），拆成每个意向一条，
// 否则正文是所有意向的拼接，既超长又让匹配分失真。发布前（normalizeJobs）才展开，原始快照与证据校验不变。
const expand=jobs=>jobs.flatMap(row=>row.intentions&&row.intentions.length>1?row.intentions.map(i=>({...row,intentions:[i],split:true})):[row]);
// 增量：详情文本与列表一致，校园另有岗位意向（description）；以“校园有 description／社招有 requirements”作为已取得详情的标志。
const hasDetail=job=>job.channels.includes('campus')?job.description.trim()!=='':job.requirements.trim()!=='';
module.exports={expand,hasDetail,PROFILES,requiresVerification,verifiedSource,validateJobs,validateEvidence,normalizeRecord,portalNotice,collectAvailable,fetchAvailable,run};
if(require.main===module)run(process.argv.slice(2)).catch(error=>{console.error(error.message);process.exitCode=1;});
