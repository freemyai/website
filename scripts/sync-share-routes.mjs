import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadCatalog, root } from '../src/validate.mjs';

const slugOk=value=>typeof value==='string'&&value.length<=80&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

export function buildShareRedirects(manifest){
  if(!Array.isArray(manifest))throw new Error('Invalid share manifest');
  const result=[],seen=new Set();
  for(const entry of manifest){
    const prefix=entry.locale==='en'?'':'/zh';
    const canonicalPrefix=entry.locale==='en'?'/en/works/':'/works/';
    if(!['en','zh'].includes(entry.locale)||!slugOk(entry.shareSlug)||entry.sharePath!==`${prefix}/${entry.shareSlug}/`||
       !entry.canonicalPath?.startsWith(canonicalPrefix)||!entry.canonicalPath.endsWith('/')||
       !slugOk(entry.canonicalPath.slice(canonicalPrefix.length,-1))||!Array.isArray(entry.previousSlugs))throw new Error('Invalid canonical or share route');
    for(const slug of [entry.shareSlug,...entry.previousSlugs]){
      if(!slugOk(slug))throw new Error('Invalid share alias');
      for(const ending of ['','/']){
        const source=`${prefix}/${slug}${ending}`;
        if(seen.has(source))throw new Error(`Duplicate share route: ${source}`);
        seen.add(source);result.push({source,destination:entry.canonicalPath,permanent:true});
      }
    }
  }
  return result.sort((a,b)=>a.source.localeCompare(b.source,'en'));
}

export function mergeShareRedirects(config,previous,generated){
  if(!config||!Array.isArray(config.redirects)||!Array.isArray(previous)||!Array.isArray(generated))throw new Error('Invalid redirect configuration');
  const old=new Map(previous.map(rule=>[rule.source,rule]));
  if(old.size!==previous.length)throw new Error('Duplicate managed route');
  const actual=new Map();
  for(const rule of config.redirects){
    if(actual.has(rule.source))throw new Error(`Duplicate configured route: ${rule.source}`);
    actual.set(rule.source,rule);
  }
  for(const [source,rule] of old)if(!actual.has(source)||!equal(actual.get(source),rule))throw new Error(`Managed route changed: ${source}`);
  const manual=config.redirects.filter(rule=>!old.has(rule.source));
  const manualSources=new Set(manual.map(rule=>rule.source));
  for(const rule of generated)if(manualSources.has(rule.source))throw new Error(`Share route conflicts with existing route: ${rule.source}`);
  return {...config,redirects:[...manual,...generated]};
}

export function mergeShareHistory(registry,history){
  if(registry?.version!==1||!Array.isArray(registry.entries)||history?.version!==1||!history.owners||Array.isArray(history.owners)||typeof history.owners!=='object')throw new Error('Invalid share history');
  const current=new Map();
  for(const entry of registry.entries)for(const slug of [entry.share_slug,...entry.previous_slugs]){
    if(!slugOk(slug)||typeof entry.work_id!=='string'||!entry.work_id||current.has(slug))throw new Error('Invalid or duplicate share history alias');
    current.set(slug,entry.work_id);
  }
  for(const [slug,owner] of Object.entries(history.owners)){
    if(!slugOk(slug)||typeof owner!=='string'||!owner)throw new Error('Invalid share history owner');
    if(!current.has(slug))throw new Error(`Historical share alias removed: ${slug}`);
    if(current.get(slug)!==owner)throw new Error(`Historical share alias reassigned: ${slug}`);
  }
  return {version:1,owners:Object.fromEntries([...current.entries()].sort(([a],[b])=>a.localeCompare(b,'en')))};
}

export function checkShareRoutes({write=false}={}){
  const configPath=path.join(root,'vercel.json'), managedPath=path.join(root,'config','share-redirects.json'),historyPath=path.join(root,'config','share-history.json');
  const config=JSON.parse(fs.readFileSync(configPath,'utf8'));
  const old=fs.existsSync(managedPath)?JSON.parse(fs.readFileSync(managedPath,'utf8')):[];
  const history=fs.existsSync(historyPath)?JSON.parse(fs.readFileSync(historyPath,'utf8')):{version:1,owners:{}};
  const registry=JSON.parse(fs.readFileSync(path.join(root,'data','share-aliases.json'),'utf8'));
  const nextHistory=mergeShareHistory(registry,history);
  const generated=buildShareRedirects(loadCatalog().shareManifest);
  const merged=mergeShareRedirects(config,old,generated);
  if(!write){
    if(!equal(old,generated)||!equal(merged,config)||!equal(history,nextHistory))throw new Error('Share redirects or history are out of sync; run npm run share:sync');
  }else{
    fs.mkdirSync(path.dirname(managedPath),{recursive:true});
    fs.writeFileSync(configPath,JSON.stringify(merged,null,2)+'\n');
    fs.writeFileSync(managedPath,JSON.stringify(generated,null,2)+'\n');
    fs.writeFileSync(historyPath,JSON.stringify(nextHistory,null,2)+'\n');
  }
  const count=(merged.redirects?.length||0)+(merged.rewrites?.length||0)+(merged.headers?.length||0)+(merged.routes?.length||0);
  return {shareRoutes:generated.length,configuredRoutes:count};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  const write=process.argv.includes('--write');
  const count=checkShareRoutes({write});
  console.log(`Share routes ${write?'synchronized':'checked'}: ${count.shareRoutes} aliases; ${count.configuredRoutes} configured routes. Verify current Vercel limits before deployment.`);
}
