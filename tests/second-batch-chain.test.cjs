'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {adapterCommand}=require('../crawler/crawl'),{loadSites,normalizeJobs,validateSnapshot}=require('../crawler/publish');
const keys=['alibaba','baichuan','bilibili','bilibili_social','ant','ant_social','kuaishou','kuaishou_social'];
test('second-batch profiles independently gate both dispatch and publication; never inherit completeness or downgrade',()=>{
 const sites=loadSites();
 for(const key of keys){
  const site=sites.find(s=>s.key===key),portal=require('../crawler/lib/custom/'+site.adapter.replace('-portal-v1','_portal.js'));
  assert(portal.verifiedSource(site),key+' fixed registry profile');
  const command=adapterCommand(site,'/tmp/unused-second-batch-raw.json');assert.equal(path.basename(command.script),site.adapter.replace('-portal-v1','_portal.js'));assert.equal(command.timeout,900000);
  assert.throws(()=>validateSnapshot({complete:true,jobs:[],verification:{policy:'available'}},null,site),/completeness|complete/);
  for(const change of [{adapter:undefined},{ats:'moka'},{company:'未经核验单位'},{key:'future_unknown'},{body:{...site.body,pageSize:999}}]){
   const bad={...site,...change};if(change.adapter===undefined&&Object.hasOwn(change,'adapter'))delete bad.adapter;
   assert.equal(adapterCommand(bad,'/tmp/unused-second-batch-raw.json'),null,key+' blocks downgrade');
   assert.throws(()=>normalizeJobs([],bad),/identity|verified|scope/);
  }
 }
});
