'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const feishu=require('../crawler/lib/feishu');
const SOCIAL=require('../crawler/sites.json').sites.find(s=>s.key==='bytedance_social');
const response=(jobs,total=jobs.length)=>({status:200,body:{code:0,data:{job_post_list:jobs,count:total}}});
const post=(id,category)=>({id,title:'其他职业',description:'完整职责 List<T>',requirement:'完整要求 Agent',job_category:{id:category,name:'官网类别'},recruit_type:{name:'正式',parent:{name:'社招'}}});
// Reduced to the real first-party taxonomy, not invented grouping of its leaves.
const TREE=require('./fixtures/bytedance-category-tree.json');
const tree=()=>({status:200,body:{code:0,data:{job_type_list:structuredClone(TREE)}}});
function options(change={}){return {readFilters:async()=>tree(),request:async body=>{assert.equal(body.portal_type,2);assert.equal(body.keyword,'');assert.deepEqual(body.subject_id_list,[]);const n=SOCIAL.categoryGroups.findIndex(g=>JSON.stringify(g)===JSON.stringify(body.job_category_id_list));assert(n>=0,'Only reviewed category groups are sent');return response([post('official-'+n,SOCIAL.categoryGroups[n][1])]);},sleepImpl:async()=>{},delayMs:0,...change};}

test('only the exact reviewed social classified profile qualifies; broad/unreviewed scopes remain blocked',()=>{
 assert.equal(feishu.verifiedSource(SOCIAL),true);
 for(const change of [{adapter:undefined},{adapter:'bytedance-v1'},{portalType:6},{categoryTreeHash:undefined},{categoryTreeHash:'changed'},{categoryRootIds:[]},{categoryGroups:[SOCIAL.categoryGroups[0]]},{categoryGroups:SOCIAL.categoryGroups.map(g=>g.slice(1))},{key:'other'},{company:'其他'},{subjectIdList:['project']},{websitePath:'campus'}])assert.equal(feishu.verifiedSource({...SOCIAL,...change}),false);
});
test('scoped aggregate is derived from official disjoint partition totals, with two full scans each',async()=>{
 let filters=0,requests=0;const o=options(),result=await feishu.fetchClassified(SOCIAL,{...o,readFilters:async()=>{filters++;return tree()},request:async body=>{requests++;return o.request(body)}});
 assert.equal(filters,2);assert.equal(requests,4);assert.equal(result.complete,true);assert.equal(result.total,2);assert.deepEqual(result.jobs.map(j=>j.id),['official-0','official-1']);assert(result.jobs.every(j=>j.requirements==='完整要求 Agent'&&j.duty.includes('List<T>')&&j.employment===null&&j.date===null));
});
test('a newly added, removed or duplicated category/root blocks updates rather than silently changing coverage',async()=>{
 for(const mutate of [t=>t.push({id:'new-root',children:[]}),t=>t[0].children.push({id:'new-leaf',children:null}),t=>t[0].children.pop(),t=>t[0].children.push(t[0].children[0]),t=>{t[0].name='changed'},t=>{t[2].children.push(t[1].children.pop())},t=>{t[1].children[0].parent.id='wrong-parent'}]){const r=tree();mutate(r.body.data.job_type_list);await assert.rejects(feishu.fetchClassified(SOCIAL,options({readFilters:async()=>r})),/category|scope|tree/i);}
});
test('filter HTTP/business/shape failures and a changed ending tree never produce a complete scoped result',async()=>{
 for(const r of [{status:405,body:{}},{status:200,body:{code:1}},{status:200,body:{code:0,data:{job_type_list:[]}}},{status:200,body:{code:0,success:false,data:tree().body.data}}])await assert.rejects(feishu.fetchClassified(SOCIAL,options({readFilters:async()=>r})),/filter|category|scope|tree/i);
 let n=0;await assert.rejects(feishu.fetchClassified(SOCIAL,options({readFilters:async()=>{const r=tree();if(n++)r.body.data.job_type_list[0].name='changed';return r}})),/tree.*changed/i);
});
test('outside/uncategorized/wrong-partition records, capped totals and source overlap are never silently dropped',async()=>{
 for(const request of [async()=>response([post('x','outside')]),async()=>response([post('x',undefined)]),async()=>response([post('x',SOCIAL.categoryGroups[1][1])]),async()=>response([],10000),async body=>response([post('same',body.job_category_id_list[1])])])await assert.rejects(feishu.fetchClassified(SOCIAL,options({request})),/scope|partition|category|10000|overlap|Duplicate/i);
});
test('invalid canonical classified posts are rejected again at normalization, even if both raw and projection were changed',()=>{
 assert.throws(()=>feishu.normalizePost(post('outside','outside'),SOCIAL),/scope|category/i);
});
test('scoped valid empty requires stable approved tree and both scans of both groups',async()=>{
 let n=0;assert.deepEqual(await feishu.fetchClassified(SOCIAL,options({request:async()=>{n++;return response([],0)}})),{complete:true,total:0,jobs:[]});assert.equal(n,4);
});
