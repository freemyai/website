import { createHash, timingSafeEqual } from 'node:crypto';

const projectId='prj_MNdw24GcYvvsiH3eZycYdENagguO';
const teamId='team_Lp6fF6f7p6clgypmGqHddxK0';
const names=new Set(['preview_open','experience_open','work_view','work_impression']);
const pages=new Set(['home','explore','type','topic','collection','work']);
const entries=new Set(['card','related','dialog','detail']);

export function authorize(header,secret){
  if(!/^[A-Za-z0-9_-]{43,128}$/.test(secret||'')||typeof header!=='string'||header.length>512||!header.startsWith('Basic '))return false;
  let decoded;
  try {decoded=Buffer.from(header.slice(6),'base64').toString('utf8');}catch{return false;}
  const expected=createHash('sha256').update(`freemy:${secret}`).digest();
  const actual=createHash('sha256').update(decoded).digest();
  return timingSafeEqual(expected,actual);
}

export function makeFilter(name,{lang='',page='',entry=''}={}){
  if(!names.has(name)||!['','en','zh'].includes(lang)||page&&!pages.has(page)||entry&&!entries.has(entry))throw new Error('Invalid filter');
  const parts=[`eventName eq '${name}'`,"not startswith(eventData/placement,'qa:')"];
  if(lang)parts.push(`startswith(eventData/placement,'${lang}:')`);
  if(page)parts.push(`contains(eventData/placement,':${page}:')`);
  if(entry)parts.push(`endswith(eventData/placement,':${entry}')`);
  return parts.join(' and ');
}

export function metricCell({available,since,until,start,value}){
  if(!available)return '不可用';
  const started=Date.parse(start||'');
  if(!Number.isFinite(started)||until<=started)return '未采集';
  if(!Number.isSafeInteger(value)||value<0)return '不可用';
  return `${value}${since<started?'*':''}`;
}

export function escapeCsv(value){
  let cell=String(value??'');
  if(/^[\s]*[=+@-]/.test(cell))cell=`'${cell}`;
  return `"${cell.replaceAll('"','""')}"`;
}

export async function getEventCounts({fetchImpl=fetch,token,name,since,until,filters}){
  const url=new URL('https://api.vercel.com/v1/query/web-analytics/events/aggregate');
  for(const [key,value] of Object.entries({projectId,teamId,since,until,by:'eventData/work_id',filter:makeFilter(name,filters),limit:'100'}))url.searchParams.set(key,value);
  const response=await fetchImpl(url,{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(12000)});
  if(!response.ok)throw new Error('Analytics provider unavailable');
  const result=await response.json();
  if(!Array.isArray(result.data))throw new Error('Invalid analytics response');
  const rows=new Map();
  for(const row of result.data){
    if(row.eventData==='Others')throw new Error('Analytics result is incomplete');
    if(typeof row.eventData!=='string'||!Number.isSafeInteger(row.count)||row.count<0||!Number.isSafeInteger(row.visitors)||row.visitors<0)throw new Error('Invalid analytics row');
    rows.set(row.eventData,{count:row.count,visitors:row.visitors});
  }
  return rows;
}

export async function getPageTotals({fetchImpl=fetch,token,since,until}){
  const url=new URL('https://api.vercel.com/v1/query/web-analytics/visits/count');
  for(const [key,value] of Object.entries({projectId,teamId,since,until}))url.searchParams.set(key,value);
  const response=await fetchImpl(url,{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(12000)});
  if(!response.ok)throw new Error('Analytics provider unavailable');
  const result=await response.json(), data=result.data;
  if(!data||!Number.isSafeInteger(data.pageviews)||!Number.isSafeInteger(data.visitors))throw new Error('Invalid analytics response');
  return data;
}
