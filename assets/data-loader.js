'use strict';
// Static, publisher-produced parts only. Works over HTTP and adjacent file:// scripts.
(()=>{
  const data=globalThis.ANDE_DATA, pending=new Map(), ids=new Set((data?.jobs||[]).map(j=>j.id));
  globalThis.ANDE_CHUNKS=Object.create(null);
  function load(part){
    if(pending.has(part.id))return pending.get(part.id);
    const promise=new Promise((resolve,reject)=>{
      const script=document.createElement('script');let finished=false;
      const timer=setTimeout(()=>finish(new Error('岗位数据加载超时，请缩小单位范围或再次查询。')),30000);
      function finish(error){if(finished)return;finished=true;clearTimeout(timer);script.remove();error?reject(error):resolve();}
      script.onload=()=>{
        if(finished)return;
        try{
          const jobs=globalThis.ANDE_CHUNKS[part.id], seen=new Set();
          if(!Array.isArray(jobs)||jobs.length!==part.count)throw new Error('岗位分片数量不匹配');
          for(const job of jobs){
            if(!job||typeof job.id!=='string'||!job.id||job.sourceKey!==part.sourceKey||job.company!==part.company||ids.has(job.id)||seen.has(job.id))throw new Error('岗位分片身份不匹配');
            seen.add(job.id);
          }
          for(const job of jobs){data.jobs.push(job);ids.add(job.id);}
          delete globalThis.ANDE_CHUNKS[part.id];finish();
        }catch(error){delete globalThis.ANDE_CHUNKS[part.id];finish(error);}
      };
      script.onerror=()=>finish(new Error('岗位数据加载失败，请再次查询；上次结果未改变。'));
      script.src=new URL('data/'+part.file,document.baseURI).href;
      document.head.appendChild(script);
    });
    pending.set(part.id,promise);
    promise.catch(()=>{if(pending.get(part.id)===promise)pending.delete(part.id);});
    return promise;
  }
  globalThis.ANDE_LOAD_PARTS=async(parts,onProgress=()=>{})=>{
    if(!data||!Array.isArray(data.jobs)||!Array.isArray(parts))throw new Error('岗位目录未成功加载，请刷新页面。');
    for(const part of parts)if(!part||!/^[a-f0-9]{64}$/.test(part.id)||part.file!=='parts/'+part.id+'.js'||!Number.isSafeInteger(part.count)||part.count<1||typeof part.sourceKey!=='string'||typeof part.company!=='string')throw new Error('岗位分片目录无效');
    onProgress(0,parts.length);
    for(let i=0;i<parts.length;i++){await load(parts[i]);onProgress(i+1,parts.length);}
  };
})();
