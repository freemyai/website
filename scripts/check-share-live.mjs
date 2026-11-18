import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { root } from '../src/validate.mjs';
import { parse } from 'parse5';

const attrs=node=>Object.fromEntries((node?.attrs||[]).map(item=>[item.name,item.value]));
function nodes(node){return [node,...(node.childNodes||[]).flatMap(nodes)];}
function correctPage(html,target,{locale,workId}){
  const tree=nodes(parse(html)),htmlTag=tree.find(n=>n.tagName==='html');
  const canonical=tree.filter(n=>n.tagName==='link'&&attrs(n).rel==='canonical').map(n=>attrs(n).href);
  const og=tree.find(n=>n.tagName==='meta'&&attrs(n).property==='og:url');
  if(attrs(htmlTag).lang!==(locale==='en'?'en':'zh-CN')||canonical.length!==1||canonical[0]!==`https://freemy.ai${target}`||attrs(og).content!==canonical[0])return false;
  return workId?tree.some(n=>attrs(n)['data-detail-work']===workId):html.includes('ai@freemy.ai');
}

export async function checkLiveShare({origin='https://freemy.ai',fetchImpl=fetch}={}){
  const base=new URL(origin);
  if(base.protocol!=='https:'||base.username||base.password||base.port||base.pathname!=='/'||base.search||base.hash||!(base.hostname==='freemy.ai'||base.hostname.endsWith('.vercel.app')))throw new Error('Invalid live audit origin');
  const errors=[],checks=[],routes=[['/hydraulics/','/en/works/hydraulics/','en','hydraulics'],['/zh/hydraulics/','/works/hydraulics/','zh','hydraulics'],['/tree-appreciator/','/en/works/tree-appreciator/','en','tree-appreciator'],['/zh/tree-appreciator/','/works/tree-appreciator/','zh','tree-appreciator']];
  const request=async(pathname,method='GET')=>fetchImpl(new URL(pathname,base),{method,redirect:'manual',signal:AbortSignal.timeout(15000)});
  for(const [source,target] of routes)for(const method of ['GET','HEAD']){
    try{
      const res=await request(source,method), location=res.headers.get('location'),dest=location?new URL(location,base):null;
      checks.push({source,method,status:res.status,location:dest?.href||null});
      if(res.status!==308||dest?.origin!==base.origin||dest.pathname!==target)errors.push(`${method} ${source}: expected one 308 to ${target}`);
    }catch{errors.push(`${method} ${source}: request failed`);}
  }
  for(const [source,target] of routes)for(const method of ['GET','HEAD']){
    try{
      const unslashed=source.slice(0,-1),first=await request(unslashed,method),firstUrl=first.headers.get('location'),dest=firstUrl?new URL(firstUrl,base):null;
      checks.push({source:unslashed,method,status:first.status,location:dest?.href||null});
      if(first.status!==308||dest?.origin!==base.origin)throw new Error('invalid first redirect');
      if(dest.pathname===source){
        const second=await request(source,method),next=second.headers.get('location'),final=next?new URL(next,base):null;
        if(second.status!==308||final?.origin!==base.origin||final.pathname!==target)throw new Error('invalid second redirect');
      }else if(dest.pathname!==target)throw new Error('invalid redirect destination');
    }catch{errors.push(`${method} ${source.slice(0,-1)}: expected at most two in-domain redirects to ${target}`);}
  }
  let queryPreserved=null;
  try{
    const res=await request('/hydraulics/?campaign=freemy-qa&url=https%3A%2F%2Fevil.example%2F');
    const location=res.headers.get('location'),dest=location?new URL(location,base):null;
    if(res.status!==308||dest?.origin!==base.origin||dest.pathname!=='/en/works/hydraulics/')errors.push('Query parameters changed the redirect destination');
    queryPreserved=dest?.searchParams.get('campaign')==='freemy-qa';
  }catch{errors.push('Query-parameter redirect request failed');}
  const pages=[...routes.map(([,target,locale,workId])=>({target,locale,workId})),{target:'/en/contact/',locale:'en'},{target:'/contact/',locale:'zh'}];
  for(const page of pages)for(const method of ['GET','HEAD']){
    try{
      const res=await request(page.target,method);checks.push({source:page.target,method,status:res.status});
      if(res.status!==200)errors.push(`${method} ${page.target}: expected 200`);
      else if(method==='GET'&&!correctPage(await res.text(),page.target,page))errors.push(`${page.target}: wrong page identity, canonical or language`);
    }catch{errors.push(`${method} ${page.target}: request failed`);}
  }
  try{const res=await request('/__freemy-share-missing__/');if(res.status!==404)errors.push('Unknown alias did not return 404');}catch{errors.push('Unknown alias 404 check failed');}
  try{const res=await request('/en/'),dest=new URL(res.headers.get('location'),base);if(res.status!==308||dest.origin!==base.origin||dest.pathname!=='/')errors.push('Existing English-home redirect changed');}catch{errors.push('English-home redirect check failed');}
  try{
    let res=await request('/api/insights');
    if([301,302,307,308].includes(res.status)){
      const dest=new URL(res.headers.get('location'),base);if(dest.origin!==base.origin)throw new Error('external redirect');res=await request(dest.pathname);
    }
    if(![401,403,503].includes(res.status))errors.push('Private insights did not remain protected');
  }catch{errors.push('Private insights protection check failed');}
  return {origin:base.origin,checks,queryPreserved,errors};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  const index=process.argv.indexOf('--base'),origin=index>=0?process.argv[index+1]:'https://freemy.ai';
  const result=await checkLiveShare({origin});
  const dir=path.join(root,'reports','share');fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'live-audit.json'),JSON.stringify(result,null,2)+'\n');
  if(result.errors.length){console.error(`Live share audit failed:\n${result.errors.join('\n')}`);process.exitCode=1;}
  else console.log(`Live share audit PASS: ${result.checks.length} checks; query preserved: ${result.queryPreserved}.`);
}
