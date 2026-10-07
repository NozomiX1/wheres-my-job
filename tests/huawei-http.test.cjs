'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const h=require('../crawler/lib/custom/huawei_http');
// Synthetic public bootstrap marker, not a real credential.
function mock(status=200,business='SUCCESS') {
  const calls=[],delays=[];
  return {calls,delays,options:{sleep:async ms=>delays.push(ms),fetchImpl:async (url,init)=>{
    calls.push({url,init});
    return calls.length===1?{status:200,text:async()=>`({jalorSecurityToken:'synthetic-public-marker'})`}:{status,json:async()=>({status:business,errors:null,data:{pageVO:{totalRows:101},result:[{advertisementId:36384}]}})};
  }}};
}
test('real Referer, not x-Referer alone, on both normal anonymous Huawei scopes',async()=>{
  for(const [key,type]of [['huawei','CR'],['huawei_social','SR']]){
    const m=mock(),page=await h.open(key,m.options),r=await page(1),req=m.calls[1].init;
    assert.equal(req.headers.Referer,'https://career.huawei.com/');
    assert.equal(req.headers['x-Referer'],'https://career.huawei.com/cn');
    assert.equal(req.headers['X-Csrf-Token'],'synthetic-public-marker');
    for(const k of ['User-Agent','Cookie','Authorization'])assert(!Object.hasOwn(req.headers,k));
    assert.deepEqual(JSON.parse(req.body),{curPage:1,pageSize:10,jobType:type});
    assert.equal(req.redirect,'manual');assert(req.signal instanceof AbortSignal);assert.deepEqual(m.delays,[200,200]);
    assert(!JSON.stringify(r).includes('synthetic-public-marker'));assert(!Object.hasOwn(r,'complete'));
  }
});
test('HTTP/business refusal has no automatic retry or fallback',async()=>{
  for(const [status,business]of [[412,'SUCCESS'],[302,'SUCCESS'],[200,'FAILURE']]){
    const m=mock(status,business),page=await h.open('huawei',m.options);
    await assert.rejects(page(1),/refusal/);assert.equal(m.calls.length,2);
    await assert.rejects(page(2),/stopped/);assert.equal(m.calls.length,2);
  }
});
test('same Huawei client cannot issue concurrent pages',async()=>{
  let release,posts=0;
  const page=await h.open('huawei',{sleep:async()=>{},fetchImpl:async(url,init)=>{
    if(init.method==='GET')return{status:200,text:async()=>`({jalorSecurityToken:''})`};
    posts++;if(posts===1)await new Promise(r=>release=r);
    return{status:200,json:async()=>({status:'SUCCESS',errors:null,data:{result:[]}})};
  }});
  const first=page(1);await new Promise(r=>setImmediate(r));
  const second=page(2);
  // Release the in-flight request even when the guard is broken (red test must not hang).
  const guard=assert.rejects(second,/in flight/);
  release();await first;await guard;assert.equal(posts,1);
});

test('unverified scopes/pages/bootstrap reject without a job request',async()=>{
  const m=mock();await assert.rejects(h.open('other',m.options),/scope/);assert.equal(m.calls.length,0);
  const page=await h.open('huawei_social',m.options);
  for(const n of [0,-1,1.5,'1',1000])await assert.rejects(page(n),/page/);
  assert.equal(m.calls.length,1);
  for(const token of [null,'x\r\ny'])assert.throws(()=>h.headers(token),/CSRF/);
});
test('official public bootstrap may have an empty CSRF value; actual Referer is still required',async()=>{
  const calls=[];
  const page=await h.open('huawei',{sleep:async()=>{},fetchImpl:async(url,init)=>{
    calls.push(init);
    return calls.length===1?{status:200,text:async()=>`({jalorSecurityToken:''})`}:{status:200,json:async()=>({status:'SUCCESS',errors:null,data:{result:[]}})};
  }});
  await page(1);
  assert.equal(calls[1].headers['X-Csrf-Token'],'');
  assert.equal(calls[1].headers.Referer,'https://career.huawei.com/');
});
