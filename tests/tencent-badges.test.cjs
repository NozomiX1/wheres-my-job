'use strict';
const test=require('node:test'),a=require('node:assert/strict'),p=require('../crawler/lib/custom/tencent_portal');
const [campus,social]=p.PROFILES;
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{runCrawl}=require('../crawler/crawl'),pub=require('../crawler/publish');
function row(label){return {post:{postId:'2092829497043894272',positionTitle:'  原标题不是性质  ',workCities:'Singapore',positionSource:'workday',positionUrl:'https://tencent.wd1.myworkdayjobs.com/Tencent_Careers/job/Singapore-CapitaSky/Associate-Backend-Engineer_R108032',recruitLabelName:label},detail:null};}
test('Explicit same-clock publisher reprojection applies verified badges even to empty JD, without refreshing material clock or out',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ande-qq-badges-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));const file=path.join(dir,'jobs.js'),clock='2026-10-08T12:22:06.608Z',native=row('日常实习 青云计划');
 const raw=p.collectAvailable([{request:p.requestFor(campus,1,1),httpStatus:200,response:{status:0,message:'',data:{count:1,positionList:[native.post]}}}],campus);
 a.equal(runCrawl(campus,{outDir:dir,now:()=>clock,log:()=>{},runner:(_,args)=>{fs.writeFileSync(args.at(-1),JSON.stringify({key:campus.key,api:campus.api,mode:'custom',...raw}));return {status:0};}}).code,0);
 const normalize=p.normalizeRecord,undo=t.mock.method(p,'normalizeRecord',(...args)=>({...normalize(...args),employment:null,talentPlan:null}));const options={outDir:dir,dataFile:file,sites:[campus],keys:[campus.key]};const initial=pub.publish(options);a.equal(initial.code,0);undo.mock.restore();
 const files=Object.fromEntries(fs.readdirSync(dir).filter(n=>n.endsWith('_snapshot.json')||n.endsWith('_status.json')||n.endsWith('_raw.json')).map(n=>[n,fs.readFileSync(path.join(dir,n),'utf8')]));
 const repaired=pub.publish({...options,reproject:true});a.equal(repaired.code,0);a.equal(repaired.data.jobs[0].employment,'internship');a.equal(repaired.data.jobs[0].talentPlan,true);a.deepEqual({...repaired.data.jobs[0],employment:null,talentPlan:null},initial.data.jobs[0]);a.equal(repaired.data.sources[0].lastSuccess,clock);for(const [n,text]of Object.entries(files))a.equal(fs.readFileSync(path.join(dir,n),'utf8'),text);
});
test('Tencent campus visible exact native badges prove internship/Qingyun independently without body or invented full-time',()=>{
 for(const [label,employment,talentPlan]of [['应届毕业生',null,null],['应届实习','internship',null],['日常实习','internship',null],['应届毕业生 青云计划',null,true],['实习生 青云计划','internship',true],['青云计划',null,true],['实习生','internship',null],['实习生 实习生 青云计划','internship',true],['日常实习 青云计划','internship',true]]){
  const native=row(label),before=structuredClone(native),j=p.normalizeRecord(native,campus);a.equal(j.employment,employment,label);a.equal(j.talentPlan,talentPlan,label);a.equal(j.title,native.post.positionTitle);a.equal(j.description,'');a.deepEqual(j.channels,['campus']);a.equal(j.jdComplete,false);a.equal(j.date,null);a.deepEqual(native,before);
 }
});
test('Tencent badges are optional TEXT and only first three native rendered tokens count; unknown/absent and social remain unknown',()=>{
 for(const label of [undefined,null,'','全职','应届','未知实习项目','实习生计划','青云计划候选','未知 未知 未知 青云计划','未知\t青云计划']){const j=p.normalizeRecord(row(label),campus);a.equal(j.employment,null);a.equal(j.talentPlan,null);}
 const missing=row();delete missing.post.recruitLabelName;a.equal(p.normalizeRecord(missing,campus).talentPlan,null);
 for(const label of [[],{},1,true])a.throws(()=>p.normalizeRecord(row(label),campus),/recruitLabelName/);
 const native={post:{PostId:'123',RecruitPostName:'日常实习 青云计划',LocationName:'深圳',CategoryName:'技术',Responsibility:'  已得原职责  ',SourceID:4,PostURL:row('').post.positionUrl,recruitLabelName:'日常实习 青云计划'},detail:null};const j=p.normalizeRecord(native,social);a.equal(j.employment,null);a.equal(j.talentPlan,null);a.equal(j.duty,native.post.Responsibility);
});
