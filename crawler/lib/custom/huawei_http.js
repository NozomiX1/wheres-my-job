'use strict';
// Normal anonymous transport only; source qualification lives in huawei_portal.js.
const ORIGIN='https://career.huawei.com';
const CONFIG=ORIGIN+'/-/media/plugin/8215bc3cf8d83f9ec3298d3aa077f167/common.min.js?t=1788258241541';
const API='https://apigw-dgg-b0.huawei.com/api/apig/channelhw/recruitmentPosition/pub/getJobPage?X-HW-ID=app_000000035886';
const TYPES=Object.freeze({huawei:'CR',huawei_social:'SR'});
function headers(csrf) {
  if(typeof csrf!=='string' || /[\r\n]/.test(csrf)) throw new Error('Huawei: invalid public bootstrap CSRF');
  return {'Content-Type':'application/json',Accept:'application/json','X-HW-ID':'app_000000035886','x-jalor-tenantAlias':'hcm','x-language':'zh_CN','x-Referer':ORIGIN+'/cn','x-alb-gray':'prod','X-Csrf-Token':csrf,Referer:ORIGIN+'/'};
}
async function open(key,{fetchImpl=globalThis.fetch,sleep=ms=>new Promise(r=>setTimeout(r,ms))}={}) {
  if(!Object.hasOwn(TYPES,key) || typeof fetchImpl!=='function' || typeof sleep!=='function') throw new Error('Huawei: unverified request scope');
  async function get(url,init) {
    await sleep(200);
    const r=await fetchImpl(url,{...init,redirect:'manual',signal:AbortSignal.timeout(15000)});
    if(r?.status!==200) throw new Error('Huawei: HTTP refusal '+r?.status);
    return r;
  }
  const config=await (await get(CONFIG,{method:'GET'})).text();
  const csrf=config.match(/jalorSecurityToken:\s*["']([^"']*)["']/)?.[1];
  const requestHeaders=headers(csrf); // Anonymous public bootstrap; kept in memory, never persisted.
  let stopped=false,inFlight=false;
  async function send(url,body) {
    if(stopped) throw new Error('Huawei: request scope stopped');
    if(inFlight) throw new Error('Huawei: page already in flight');
    inFlight=true;
    try {
      const r=await get(url,{method:'POST',headers:requestHeaders,body:JSON.stringify(body)});
      const response=await r.json();
      if(response?.status!=='SUCCESS' || response.errors!==null || response.data==null || (url===API && !Array.isArray(response.data.result))) throw new Error('Huawei: native business/shape refusal');
      return response; // No complete/ready/count claims, credential headers or generated JD.
    } catch(error) { stopped=true; throw error; }
    finally { inFlight=false; }
  }
  const page=async curPage=>{
    if(!Number.isSafeInteger(curPage) || curPage<1 || curPage>=1000) throw new Error('Huawei: invalid page');
    return send(API,{curPage,pageSize:10,jobType:TYPES[key]});
  };
  page.detail=id=>send(requests.detail(id).url,requests.detail(id).body);
  page.intentions=id=>send(requests.intentions(id).url,requests.intentions(id).body);
  return page;
}
function positive(id) {
  if(!Number.isSafeInteger(id) || id<=0) throw new Error('Huawei: invalid official id');
  return id;
}
const requests={
  page:(key,curPage)=>({url:API,method:'POST',body:{curPage,pageSize:10,jobType:TYPES[key]}}),
  detail:id=>({url:API.replace('getJobPage','getRecruitmentPositionDetail'),method:'POST',body:{advertisementId:String(positive(id))}}),
  intentions:id=>({url:API.replace('getJobPage','getPositionIntentionList'),method:'POST',body:{jobId:positive(id)}})
};
module.exports={headers,open,requests,ORIGIN,API,TYPES};
