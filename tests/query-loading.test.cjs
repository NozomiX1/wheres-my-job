'use strict';
// 前端查询流程：注入 fetch，不访问网络。结果由服务端排序分页；点开岗位才取完整内容。
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const script=fs.readFileSync(require.resolve('../assets/app.js'),'utf8').replace(/\nrestorePreferences\(\);\nrender\(\);\s*$/,'');
function fixture(){
 const elements=new Map(),requests=[],data={version:1,companies:[{name:'甲',initial:'A',aliases:[]}],sources:[],notices:[],jobs:[],parts:[{company:'甲',sourceKey:'a',count:1}]};
 const element=id=>{if(!elements.has(id))elements.set(id,{value:'',innerHTML:'',textContent:'',hidden:false,style:{},setAttribute(){},focus(){},select(){},showModal(){this.open=true;},close(){this.open=false;}});return elements.get(id);};
 // 每次 fetch 登记为待决请求，测试里用 reply/fail 决定结果。
 const fetch=(url,options)=>new Promise((resolve,reject)=>requests.push({url,body:options?.body?JSON.parse(options.body):null,reply:(body,status=200)=>resolve({ok:status<400,status,json:async()=>body}),fail:()=>reject(new TypeError('x'))}));
 const ctx=vm.createContext({URL,fetch,ANDE_DATA:data,ANDE_EXAMPLES:{keywords:[],downrank:[]},document:{addEventListener(){},querySelectorAll(){return []},querySelector:element,getElementById:element},window:{scrollTo(){}},localStorage:{getItem(){return null;},setItem(){},removeItem(){}}});
 vm.runInContext(fs.readFileSync(require.resolve('../assets/rank.js'),'utf8'),ctx);vm.runInContext(script+'\nglobalThis.api={state,search,loadMore,showJob,clearSettings,render,jobCache,get message(){return loadMessage;}};',ctx);ctx.api.render();return {api:ctx.api,data,element,requests};
}
const item=(id,extra={})=>({id,sourceKey:'a',company:'甲',title:'岗位'+id,category:'',city:'',channels:['social'],employment:null,talentPlan:null,date:null,dateKind:null,sourceStatus:null,jdComplete:true,value:0,matched:[],downranked:[],matchedText:[],downrankedText:[],...extra});
const page=(items,total=items.length)=>({total,matched:0,penalized:0,offset:0,items});
const tick=()=>new Promise(r=>setImmediate(r));

test('Pending/failed query keeps prior results; only a successful response commits the captured conditions and server counts',async()=>{
 const f=fixture(),old={words:['旧词'],lowered:[],selected:[],recruitment:'all'},results=[{job:item('a:0'),value:0,matched:[],downranked:[]}];f.api.state.active=old;f.api.state.results=results;f.api.state.selected.add('甲');f.api.state.keywords=['财务'];
 const failing=f.api.search(false);assert.strictEqual(f.api.state.active,old);assert.ok(f.api.message.includes('正在查询'));f.requests[0].fail();await failing;
 assert.strictEqual(f.api.state.active,old);assert.strictEqual(f.api.state.results,results);assert.ok(f.api.message.includes('无法连接服务器'));
 const retry=f.api.search(false);f.api.state.keywords=['尚未提交的编辑'];f.api.state.selected.clear();f.api.state.recruitment='campus';
 assert.deepEqual(f.requests[1].body,{words:['财务'],lowered:[],selected:['甲'],recruitment:'all',offset:0,limit:50});
 f.requests[1].reply({total:120,matched:7,penalized:2,offset:0,items:[item('a:1',{value:4.35,matched:['财务'],matchedText:['财务 × 2']})]});await retry;
 assert.deepEqual(Array.from(f.api.state.active.words),['财务']);assert.deepEqual(Array.from(f.api.state.active.selected),['甲']);assert.equal(f.api.state.active.recruitment,'all');
 assert.equal(f.api.state.total,120);assert.equal(f.api.state.matched,7);assert.equal(f.api.state.penalized,2);assert.equal(f.api.state.results.length,1);assert.equal(f.api.message,'');
 assert.ok(f.element('jobList').innerHTML.includes('财务 × 2'),'row shows the server-computed hit counts');assert.ok(f.element('app').innerHTML.includes('120 个'));
});
test('An HTTP error from the service is shown with its message and keeps the prior results',async()=>{
 const f=fixture(),old={words:[],lowered:[],selected:[],recruitment:'all'};f.api.state.active=old;
 const pending=f.api.search(false);f.requests[0].reply({error:'请求过于频繁，请稍后再试'},429);await pending;
 assert.strictEqual(f.api.state.active,old);assert.ok(f.api.message.includes('请求过于频繁'));
});
test('Reset and newer submissions invalidate older pending queries',async()=>{
 const f=fixture();f.api.state.keywords=['财务'];const first=f.api.search(false);f.api.clearSettings();f.requests[0].reply(page([item('a:1')]));await first;
 assert.equal(f.api.state.active,null);assert.equal(f.api.state.searched,false);assert.equal(f.api.message,'');
 f.api.state.keywords=['旧查询'];const older=f.api.search(false);f.api.state.keywords=['财务'];const newer=f.api.search(false);
 f.requests[2].reply(page([item('a:2')]));await newer;const active=f.api.state.active;f.requests[1].reply(page([item('a:9')]));await older;
 assert.strictEqual(f.api.state.active,active);assert.deepEqual(Array.from(active.words),['财务']);assert.deepEqual(f.api.state.results.map(r=>r.job.id),['a:2']);
});
test('Scrolling to the end asks the service for the next page once and appends it; a newer query discards a late page',async()=>{
 const f=fixture(),search=f.api.search(false);f.requests[0].reply(page([item('a:1')],3));await search;
 const more=f.api.loadMore(),again=f.api.loadMore();assert.equal(f.requests.length,2,'one next-page request in flight at a time');assert.equal(f.requests[1].body.offset,1);
 f.requests[1].reply(page([item('a:2'),item('a:3')],3));await more;await again;assert.deepEqual(f.api.state.results.map(r=>r.job.id),['a:1','a:2','a:3']);
 await f.api.loadMore();assert.equal(f.requests.length,2,'nothing more to load');
 const f2=fixture(),s2=f2.api.search(false);f2.requests[0].reply(page([item('a:1')],3));await s2;
 const late=f2.api.loadMore();f2.api.clearSettings();f2.requests[1].reply(page([item('a:2')],3));await late;assert.equal(f2.api.state.results.length,0);
});
test('Opening a job fetches its full content once, then reuses the cache; a failed fetch is explained',async()=>{
 const f=fixture(),full={...item('a:1'),duty:'完整职责',requirements:'',description:'',url:'https://example.test/job'};
 const open=f.api.showJob('a:1');assert.ok(f.element('modalDetail').innerHTML.includes('正在加载'));assert.equal(f.element('detailDialog').open,true);assert.equal(f.requests[0].url,'api/job/a%3A1');
 f.requests[0].reply(full);await open;await tick();assert.ok(f.element('modalDetail').innerHTML.includes('完整职责'));assert.ok(f.element('detailApply').innerHTML.includes('前往官网'));
 await f.api.showJob('a:1');assert.equal(f.requests.length,1,'cached');
 const g=fixture(),bad=g.api.showJob('a:2');g.requests[0].reply({error:'岗位不存在'},404);await bad;await tick();assert.ok(g.element('modalDetail').innerHTML.includes('岗位不存在'));
});
