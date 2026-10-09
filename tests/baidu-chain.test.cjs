'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const baidu=require('../crawler/lib/custom/baidu_portal');
const {runCrawl,adapterCommand}=require('../crawler/crawl'),{publish,readPublished}=require('../crawler/publish');
const uuid=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
async function envelope(site,n,duty='原始职责 <T> &amp;\r\n不截断'){
  return baidu.fetchAvailable(site,{sleep:async()=>{},fetchImpl:async(_url,options)=>{const q=new URLSearchParams(options.body),intern=q.get('recruitType')==='INTERN';return {status:200,json:async()=>({status:'ok',data:{total:'1',pages:1,pageNum:Number(q.get('curPage')),pageSize:10,list:[{postId:uuid(n+(intern?100:0)),jobId:uuid(n+1000),name:'北京-原官网岗位(J100)',workContent:duty,serviceCondition:'原始要求',workPlace:'北京市',postType:'技术'}]}})};}});
}
test('Baidu two scopes use the sole snapshot/publisher chain: new data replaces the source, empty fields keep old JD, failure preserves baseline',async t=>{
  for(const site of baidu.PROFILES){
    const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ande-baidu-chain-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));const file=path.join(dir,'jobs.js');let sec=0;
    const apply=raw=>{const crawl=runCrawl(site,{outDir:dir,now:()=>`2026-01-01T00:00:${String(sec++).padStart(2,'0')}Z`,runner:(_,args)=>{fs.writeFileSync(args.at(-1),JSON.stringify(raw));return {status:0};}});assert.equal(crawl.code,0,crawl.message);assert.equal(crawl.status,'ready');return publish({outDir:dir,dataFile:file,sites:[site],keys:[site.key]});};
    assert.ok(adapterCommand(site,'raw.json').script.endsWith('baidu_portal.js'));
    assert.equal(apply(await envelope(site,1)).code,0);const first=readPublished(file);assert.equal(first.sources[0].status,'ready');const unit=site.track==='campus'?2:1;assert.equal(first.jobs.length,unit);assert.equal(first.jobs[0].duty,'原始职责 <T> &amp;\r\n不截断');assert.ok(first.jobs[0].url.endsWith(uuid(1)));assert.equal(first.jobs[0].jdComplete,false);
    assert.equal(apply(await envelope(site,2)).code,0);const second=readPublished(file);assert.equal(second.jobs.length,unit);assert.ok(!second.jobs.some(j=>j.id===first.jobs[0].id),'jobs missing from the new result are gone');
    assert.equal(apply(await envelope(site,2,'')).code,0);assert.equal(readPublished(file).jobs.find(j=>j.id===second.jobs[0].id).duty,second.jobs[0].duty);
        const bytes=fs.readFileSync(file),bad=await envelope(site,3);bad.verification.pages[0].httpStatus=403;
    assert.equal(runCrawl(site,{outDir:dir,now:()=> '2026-01-02T00:00:00Z',runner:(_,args)=>{fs.writeFileSync(args.at(-1),JSON.stringify(bad));return {status:0};}}).code,1);
    assert.equal(publish({outDir:dir,dataFile:file,sites:[site],keys:[site.key]}).written,false);assert.deepEqual(fs.readFileSync(file),bytes);
    assert.equal(adapterCommand({...site,body:{...site.body,keyWord:'算法'}},'raw.json'),null);const deleted={...site};delete deleted.adapter;assert.equal(adapterCommand(deleted,'raw.json'),null);
  }
});
