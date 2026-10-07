'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const h=require('../crawler/lib/custom/huawei_portal'),xh=require('../crawler/lib/custom/xiaohongshu_portal'),http=require('../crawler/lib/custom/huawei_http');
const {runCrawl,adapterCommand}=require('../crawler/crawl'),{publish,readPublished,validateSnapshot}=require('../crawler/publish');
function envelope(site,id=1){
  if(site.adapter==='huawei-portal-v1')return h.collectAvailable(site,[{request:http.requests.page(site.key,1),httpStatus:200,response:{status:'SUCCESS',errors:null,data:{pageVO:{curPage:1,pageSize:10,totalRows:2},result:[{advertisementId:id,jobId:100+id,jobName:'真实标题',workPlace:'北京',categoryName:null,mainBusiness:'完整职责',jobRequire:'完整要求'}]}}}]);
  return xh.collectAvailable([{request:{url:site.api,method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:site.body},httpStatus:200,response:{statusCode:200,alertMsg:'成功',data:{pageNum:1,pageSize:10,total:2,list:[{positionId:id,positionName:'真实标题',duty:'原文本 <T> &amp;',qualification:'完整要求',workplace:'北京',recruitStatus:'in_recruitment',jobType:'研发'}]}}}],site);
}
test('four newly qualified scopes use the sole chain: available only, incremental retention and failed input no clear',t=>{
  for(const site of [...h.PROFILES,...xh.PROFILES]){
    const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ande-new-portals-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));const file=path.join(dir,'jobs.js');let sec=0;
    const apply=raw=>{const crawl=runCrawl(site,{outDir:dir,now:()=>`2026-01-01T00:00:${String(sec++).padStart(2,'0')}Z`,runner:(_,args)=>{fs.writeFileSync(args.at(-1),JSON.stringify(raw));return {status:0};}});assert.equal(crawl.code,0,crawl.message);assert.equal(crawl.status,'available');return publish({outDir:dir,dataFile:file,sites:[site],keys:[site.key]});};
    assert.ok(adapterCommand(site,path.join(dir,'raw.json')));assert.equal(apply(envelope(site)).code,0);
    const first=readPublished(file);assert.equal(first.jobs.length,1);assert.equal(first.sources[0].status,'available');assert.equal(apply(envelope(site,2)).code,0);const second=readPublished(file);assert.equal(second.jobs.length,2);assert.deepEqual(second.jobs.find(j=>j.id===site.key+':1'),first.jobs[0]);
    const snapshot=JSON.parse(fs.readFileSync(path.join(dir,site.key+'_snapshot.json'))),status=JSON.parse(fs.readFileSync(path.join(dir,site.key+'_status.json')));
    assert.throws(()=>validateSnapshot({...snapshot,complete:true},status,site),/cannot claim|only qualifies/);
    const bytes=fs.readFileSync(file),failed=runCrawl(site,{outDir:dir,now:()=> '2026-01-02T00:00:00Z',runner:(_,args)=>{const bad=envelope(site);bad.verification.pages[0].httpStatus=403;fs.writeFileSync(args.at(-1),JSON.stringify(bad));return {status:0};}});assert.equal(failed.code,1);assert.equal(publish({outDir:dir,dataFile:file,sites:[site],keys:[site.key]}).written,false);assert.deepEqual(fs.readFileSync(file),bytes);
    assert.equal(adapterCommand({...site,body:{...site.body,keyword:'算法'}},'raw.json'),null);
  }
});
