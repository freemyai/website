// Pure shared eligibility and validation rules. Editorial evidence remains in
// the build-time records; publicLearningPayload exposes only display actions.
const idPattern=/^[a-z0-9-]{1,80}$/;
const providers=['github','huggingface','gitlab','codeberg','gitee','other'];
const kinds=['source_code','space_code','model','dataset','author_guide'];
const relations=['exact_project','upstream','community_reference'];
const scopes=['full_project','frontend','module','unknown','not_applicable'];
const matches=['candidate','verified','rejected'];
const availability=['available','unknown','restricted','unavailable'];
const publications=['candidate','published','hidden'];
const licenseStatuses=['open_source_verified','source_visible','restricted','unknown','not_applicable'];
const evidenceTypes=['repository_homepage','readme','author_post','demo_link','source_file','license_file','source_card','author_docs'];
const noteKinds=['source_walkthrough','author_summary','implementation_idea'];

const isObject=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const nonempty=value=>typeof value==='string'&&!!value.trim();
const bilingual=value=>isObject(value)&&nonempty(value.zh)&&nonempty(value.en);
const enumHas=(list,value)=>list.includes(value);
function isDate(value){
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
  const date=new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value;
}
function allowedSet(values){
  return values instanceof Set?values:Array.isArray(values)?new Set(values):new Set();
}

// Only public HTTPS domains are accepted; client-side links should never point
// at credentials, a local machine, raw IP addresses, or unexpected ports.
export function safeLearningUrl(value){
  if(typeof value!=='string'||value!==value.trim()||/[\u0000-\u0020\u007f\\]/.test(value))return null;
  try{
    const url=new URL(value), host=url.hostname.toLowerCase();
    if(url.protocol!=='https:'||url.username||url.password||url.port||host.endsWith('.')||!host.includes('.')||
       host.startsWith('[')||/^(?:\d{1,3}\.){3}\d{1,3}$/.test(host)||
       host==='localhost'||host.endsWith('.localhost')||host.endsWith('.local')||host.endsWith('.internal'))return null;
    return url.href;
  }catch{return null;}
}

function parts(url){
  // An escaped slash/backslash would make repository-path matching ambiguous.
  if(/%(?:2f|5c|00)/i.test(url.pathname))return [];
  return url.pathname.split('/').filter(Boolean);
}
function sameSegment(a,b){return a?.toLowerCase()===b?.toLowerCase();}
function isRepoPath(path){return path.length===2&&path.every(part=>part!=='.'&&part!=='..');}
function inRepository(url,repo){
  if(!repo||url.hostname!==repo.hostname||repo.search||repo.hash)return false;
  const p=parts(url),r=parts(repo);
  return r.length>=2&&p.length>=r.length&&r.every((part,index)=>sameSegment(part,p[index]));
}
function matchesGithub(resource,url,repo){
  const path=parts(url),r=repo?parts(repo):[];
  if(url.hostname!=='github.com'||path.length<2)return false;
  if(repo&&(!isRepoPath(r)||repo.hostname!=='github.com'||!sameSegment(path[0],r[0])||!sameSegment(path[1],r[1])))return false;
  if(['source_code','space_code'].includes(resource.kind)){
    if(!repo)return false;
    return path.length===2||(path[2]==='tree'&&path.length>=4)||(path[2]==='blob'&&path.length>=5);
  }
  return path.length===2||(['tree','blob'].includes(path[2])&&path.length>=4);
}
function matchesHuggingFace(resource,url,repo){
  const path=parts(url),r=repo?parts(repo):[];
  if(url.hostname!=='huggingface.co')return false;
  if(resource.kind==='source_code')return false;
  if(resource.kind==='space_code'){
    return path.length>=(path[3]==='blob'?6:5)&&path[0]==='spaces'&&['tree','blob'].includes(path[3])&&
      !!repo&&repo.hostname==='huggingface.co'&&r.length===3&&r[0]==='spaces'&&
      sameSegment(path[1],r[1])&&sameSegment(path[2],r[2]);
  }
  return path.length>=2;
}
function providerUrlValid(resource){
  const value=safeLearningUrl(resource?.url);
  if(!value||!enumHas(providers,resource.provider))return false;
  const url=new URL(value),repoValue=resource.repository_url==null?null:safeLearningUrl(resource.repository_url);
  if(resource.repository_url!=null&&!repoValue)return false;
  const repo=repoValue?new URL(repoValue):null;
  const platformHosts={'github.com':'github','huggingface.co':'huggingface','gitlab.com':'gitlab','codeberg.org':'codeberg','gitee.com':'gitee'};
  if(platformHosts[url.hostname]&&platformHosts[url.hostname]!==resource.provider)return false;
  if(resource.kind==='space_code'&&resource.provider!=='huggingface')return false;
  if(resource.provider==='github')return matchesGithub(resource,url,repo);
  if(resource.provider==='huggingface')return matchesHuggingFace(resource,url,repo);
  const known={gitlab:'gitlab.com',codeberg:'codeberg.org',gitee:'gitee.com'};
  if(known[resource.provider]&&url.hostname!==known[resource.provider])return false;
  if(known[resource.provider]&&parts(url).length<2)return false;
  if(repo&&url.hostname!==repo.hostname)return false;
  if(resource.kind==='source_code'){
    if(!inRepository(url,repo))return false;
    const tail=parts(url).slice(parts(repo).length);
    if(!tail.length)return true;
    if(resource.provider==='gitlab')return tail[0]==='-'&&['blob','tree'].includes(tail[1])&&tail.length>=(tail[1]==='blob'?4:3);
    if(resource.provider==='codeberg')return tail[0]==='src'&&['branch','commit','tag'].includes(tail[1])&&tail.length>=3;
    if(resource.provider==='gitee')return ['blob','tree'].includes(tail[0])&&tail.length>=(tail[0]==='blob'?3:2);
  }
  return true;
}
function evidenceValid(evidence){
  return Array.isArray(evidence)&&evidence.length>0&&evidence.some(item=>item?.type!=='license_file')&&
    evidence.every(item=>isObject(item)&&enumHas(evidenceTypes,item.type)&&safeLearningUrl(item.url)&&nonempty(item.summary));
}
function publishedMatch(resource){
  return isObject(resource)&&typeof resource.id==='string'&&idPattern.test(resource.id)&&resource.publication==='published'&&resource.match_status==='verified'&&
    resource.relation==='exact_project'&&resource.availability==='available'&&isDate(resource.checked_at)&&
    providerUrlValid(resource)&&evidenceValid(resource.evidence);
}
function licenseEvidenceValid(resource){
  const evidence=safeLearningUrl(resource?.license?.evidence_url);
  const repoValue=safeLearningUrl(resource?.repository_url);
  if(!evidence||!repoValue)return false;
  const url=new URL(evidence),repo=new URL(repoValue);
  if(!inRepository(url,repo))return false;
  const tail=parts(url).slice(parts(repo).length);
  // A generic license text does not show that this project adopted it.
  if(resource.provider==='github'||resource.provider==='huggingface'||resource.provider==='gitee')return tail[0]==='blob'&&tail.length>=3;
  if(resource.provider==='gitlab')return tail[0]==='-'&&tail[1]==='blob'&&tail.length>=4;
  if(resource.provider==='codeberg')return tail[0]==='src'&&['branch','commit','tag'].includes(tail[1])&&tail.length>=4;
  return tail.length>=1;
}

export function eligibleSourceLink(resource,{allowedLicenses}={}){
  return !!(publishedMatch(resource)&&['source_code','space_code'].includes(resource.kind)&&
    ['full_project','frontend','module'].includes(resource.code_scope)&&isObject(resource.license)&&
    resource.license.status==='open_source_verified'&&allowedSet(allowedLicenses).has(resource.license.expression)&&
    licenseEvidenceValid(resource)&&bilingual(resource.license.scope_note));
}

function expectedNotePath(id,lang){return `content/learning/${lang}/${id}.json`;}
function validNote(note,workId){
  return isObject(note)&&note.status==='published'&&idPattern.test(workId||'')&&enumHas(noteKinds,note.kind)&&
    note.zh_path===expectedNotePath(workId,'zh')&&note.en_path===expectedNotePath(workId,'en')&&
    isDate(note.reviewed_at)&&Array.isArray(note.evidence_urls)&&note.evidence_urls.length>0&&
    note.evidence_urls.every(value=>!!safeLearningUrl(value));
}
function safeNoteHref(value){
  return typeof value==='string'&&/^\/(?:en\/)?works\/[a-z0-9-]+\/#learning$/.test(value)?value:null;
}
function sourceLabel(resource,locale){
  const names={github:'GitHub',huggingface:'HF',gitlab:'GitLab',codeberg:'Codeberg',gitee:'Gitee',other:''};
  const name=names[resource.provider]||'';
  const scope=locale==='zh'?{full_project:'源码',frontend:'前端源码',module:'模块源码'}:{full_project:'source',frontend:'front-end source',module:'module source'};
  return [name,scope[resource.code_scope]].filter(Boolean).join(' ');
}
function actionForSource(resource,locale){
  const label=sourceLabel(resource,locale);
  return {kind:'source',resourceId:resource.id,provider:resource.provider,href:safeLearningUrl(resource.url),label,ariaLabel:label,external:true};
}
function publishedGuide(resource){return publishedMatch(resource)&&resource.kind==='author_guide';}

export function getLearningActions(record,locale,options={}){
  if(!isObject(record))return [];
  const lang=locale==='zh'?'zh':'en', sources=Array.isArray(record.sources)?record.sources:[], actions=[];
  const code=sources.find(resource=>eligibleSourceLink(resource,options));
  if(code)actions.push(actionForSource(code,lang));
  if(validNote(record.learning_note,record.work_id)&&safeNoteHref(options.noteHref)){
    const label=lang==='zh'?'学习笔记':'Learning notes';
    actions.push({kind:'learning_note',resourceId:`${record.work_id}-learning-note`,provider:'freemy',href:options.noteHref,label,ariaLabel:label,external:false});
  }else{
    const guide=sources.find(publishedGuide);
    if(guide){
      const label=lang==='zh'?'作者说明':'Creator notes';
      actions.push({kind:'author_guide',resourceId:guide.id,provider:guide.provider,href:safeLearningUrl(guide.url),label,ariaLabel:label,external:true});
    }
  }
  return actions.slice(0,2);
}
export function publicLearningPayload(record,locale,options={}){
  const actions=getLearningActions(record,locale,options);
  return {actions,hasOpenSource:actions.some(action=>action.kind==='source'),hasLearningNote:actions.some(action=>action.kind==='learning_note')};
}

// This checks data shape and policy prerequisites, not whether source/author
// claims are true. Those decisions must be made by a human reviewer first.
export function validateLearningRecord(record,{workIds,allowedLicenses}={}){
  const errors=[];
  if(!isObject(record))return ['Learning record must be an object'];
  const workId=record.work_id;
  if(!idPattern.test(workId||''))errors.push('Invalid work_id');
  if(workIds&&!(workIds instanceof Set?workIds:new Set(workIds)).has(workId))errors.push(`Unknown work_id: ${workId}`);
  const search=record.search;
  if(!isObject(search)||!enumHas(['not_searched','searched','blocked'],search.status)||!bilingual(search.notes))errors.push(`Invalid search metadata: ${workId}`);
  else if(search.status==='not_searched'?search.checked_at!=null:!isDate(search.checked_at))errors.push(`Invalid search date: ${workId}`);
  if(!Array.isArray(record.sources))errors.push(`Invalid sources: ${workId}`);
  const ids=new Set();
  for(const source of Array.isArray(record.sources)?record.sources:[]){
    if(!isObject(source)){errors.push(`Invalid source record: ${workId}`);continue;}
    const prefix=`${workId}/${source.id||'source'}`;
    if(!idPattern.test(source.id||'')||ids.has(source.id))errors.push(`Invalid or duplicate source id: ${prefix}`);
    ids.add(source.id);
    if(!enumHas(providers,source.provider)||!enumHas(kinds,source.kind)||!enumHas(relations,source.relation)||
       !enumHas(scopes,source.code_scope)||!enumHas(matches,source.match_status)||
       !enumHas(availability,source.availability)||!enumHas(publications,source.publication))errors.push(`Invalid source classification: ${prefix}`);
    if(!providerUrlValid(source))errors.push(`Invalid source URL or provider: ${prefix}`);
    if(!bilingual(source.notes))errors.push(`Incomplete source notes: ${prefix}`);
    if(source.checked_at!=null&&!isDate(source.checked_at))errors.push(`Invalid source date: ${prefix}`);
    if(source.revision!=null&&!nonempty(source.revision))errors.push(`Invalid source revision: ${prefix}`);
    if(!Array.isArray(source.evidence)||source.evidence.some(item=>!isObject(item)||!enumHas(evidenceTypes,item.type)||!safeLearningUrl(item.url)||!nonempty(item.summary)))errors.push(`Invalid source evidence: ${prefix}`);
    if(source.publication==='published'&&(source.match_status!=='verified'||!isDate(source.checked_at)||!evidenceValid(source.evidence)))errors.push(`Published source requires verification, date and evidence: ${prefix}`);
    const license=source.license;
    if(!isObject(license)||!enumHas(licenseStatuses,license.status)||!bilingual(license.scope_note))errors.push(`Invalid license: ${prefix}`);
    else{
      if(license.expression!=null&&!nonempty(license.expression))errors.push(`Invalid license expression: ${prefix}`);
      if(license.evidence_url!=null&&!safeLearningUrl(license.evidence_url))errors.push(`Invalid license URL: ${prefix}`);
      if(license.status==='open_source_verified'&&(!['source_code','space_code'].includes(source.kind)||!allowedSet(allowedLicenses).has(license.expression)||!licenseEvidenceValid(source)))errors.push(`Unverified open-source license: ${prefix}`);
      if(license.status==='restricted'&&!safeLearningUrl(license.evidence_url))errors.push(`Restricted license requires evidence: ${prefix}`);
    }
  }
  const note=record.learning_note;
  if(!isObject(note)||!enumHas(['absent','draft','published'],note.status))errors.push(`Invalid learning note: ${workId}`);
  else{
    if(note.kind!=null&&!enumHas(noteKinds,note.kind))errors.push(`Invalid learning note kind: ${workId}`);
    if(note.zh_path!=null&&note.zh_path!==expectedNotePath(workId,'zh'))errors.push(`Unsafe Chinese learning path: ${workId}`);
    if(note.en_path!=null&&note.en_path!==expectedNotePath(workId,'en'))errors.push(`Unsafe English learning path: ${workId}`);
    if(note.reviewed_at!=null&&!isDate(note.reviewed_at))errors.push(`Invalid learning review date: ${workId}`);
    if(!Array.isArray(note.evidence_urls)||note.evidence_urls.some(url=>!safeLearningUrl(url)))errors.push(`Invalid learning evidence: ${workId}`);
    if(note.status==='published'&&!validNote(note,workId))errors.push(`Published learning note requires both languages and evidence: ${workId}`);
  }
  return errors;
}
