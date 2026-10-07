'use strict';
// Normal anonymous transport only. This does NOT prove a complete source or qualify an adapter.
// Full list/detail/intention verification still has to pass the sole crawl/publisher chain.
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
  return async function page(curPage) {
    if(stopped) throw new Error('Huawei: request scope stopped');
    if(inFlight) throw new Error('Huawei: page already in flight');
    if(!Number.isSafeInteger(curPage) || curPage<1 || curPage>=1000) throw new Error('Huawei: invalid page');
    inFlight=true;
    try {
      const body={curPage,pageSize:10,jobType:TYPES[key]};
      const r=await get(API,{method:'POST',headers:requestHeaders,body:JSON.stringify(body)});
      const response=await r.json();
      if(response?.status!=='SUCCESS' || response.errors!==null || !response.data || !Array.isArray(response.data.result)) throw new Error('Huawei: native business/shape refusal');
      return response; // No complete/ready/count claims, credential headers or generated JD.
    } catch(error) { stopped=true; throw error; }
    finally { inFlight=false; }
  };
}
module.exports={headers,open};
