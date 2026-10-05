// Offline trust-boundary checks; no live requests.
'use strict';
const test=require('node:test'),a=require('node:assert/strict');
const beisen=require('../crawler/lib/beisen');
const API='https://official.example/api/jobs';
const job=id=>({Id:id,JobAdName:'完整岗位'});

test('Beisen rejects an explicitly unsuccessful or unknown business status',()=>{
  const body={Data:[],Count:0};
  for(const name of ['Success','success'])for(const value of [false,'false',null,0,1,{},[]])a.throws(()=>beisen.extractJobs({...body,[name]:value}),/Beisen/);
  for(const name of ['Success','success'])a.deepEqual(beisen.extractJobs({...body,[name]:true}),{jobs:[],total:0});
  for(const value of [0,500,'200',null,false,{}])a.throws(()=>beisen.extractJobs({...body,Code:value}),/Beisen/);
  a.deepEqual(beisen.extractJobs({...body,Code:200}),{jobs:[],total:0});
});

test('Beisen refuses duplicated or conflicting official identity before completing a list',async()=>{
  for(const jobs of [[job('1'),job('1')],[{...job('1'),id:'2'}],[{JobAdName:'没有身份'}]]){
    await a.rejects(beisen.fetchAll(API,['2'],{pageSize:2,fetchImpl:async()=>({status:200,json:async()=>({Data:jobs,Count:jobs.length})})}),/identity|Duplicate|id/i);
  }
  let count=0;
  await a.rejects(beisen.fetchAll(API,['2'],{pageSize:2,fetchImpl:async()=>({status:200,json:async()=>({Data:count++===0?[job('1'),job('2')]:[job('2')],Count:3})})}),/Duplicate/i);
});

test('Beisen valid native identity preserves the raw fields without title or occupation filtering',async()=>{
  const jobs=[{...job(0),Duty:'<p>英文 List&lt;T&gt;\n招聘@example.com</p>',Require:'十年以上',Kind:99},{...job('2'),JobAdName:'销售实习生',unknownNewField:{data:'保留'},JobAdId:190861893}];
  const result=await beisen.fetchAll(API,['2'],{fetchImpl:async()=>({status:200,json:async()=>({Code:200,Success:true,Data:jobs,Count:2})})});
  a.deepEqual(result,{complete:true,total:2,jobs});
});
