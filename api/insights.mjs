import fs from 'node:fs';
import { authorize, escapeCsv, getEventCounts, getPageTotals, makeFilter, metricCell } from './_insights-core.mjs';

const read=name=>JSON.parse(fs.readFileSync(new URL(`../data/${name}.json`,import.meta.url),'utf8'));
const e=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const eventNames=['work_impression','preview_open','work_view','experience_open'];
const titles={work_impression:'有效曝光',preview_open:'预览次数',work_view:'详情浏览',experience_open:'原站点击'};

function catalog(){
  const gallery=read('gallery'),references=read('references'),legacy=read('works'),translations=read('legacy-locales');
  const byId=new Map();
  for(const w of legacy)if(w.editorial?.status==='published')byId.set(w.id,{id:w.id,type:({physics:'experiments',engineering:'learning',electronics:'learning',robotics:'experiments'})[w.primary_category]||'apps',title:translations[w.id]?.zhTitle||w.title_original,image:''});
  for(const w of [...gallery,...references])if(w.editorial?.status==='published')byId.set(w.id,{id:w.id,type:w.type,title:w.locales?.zh?.title||w.title_original,image:w.media?.poster?.src||''});
  return [...byId.values()];
}

function dates(query){
  const now=new Date(), today=now.toISOString().slice(0,10), week=new Date(now.getTime()-6*86400000).toISOString().slice(0,10);
  const from=query.get('from')||week,to=query.get('to')||today;
  const date=value=>/^\d{4}-\d{2}-\d{2}$/.test(value)&&new Date(`${value}T00:00:00Z`).toISOString().slice(0,10)===value;
  if(!date(from)||!date(to))throw new Error('Invalid dates');
  const since=Date.parse(`${from}T00:00:00Z`),until=Date.parse(`${to}T00:00:00Z`)+86400000;
  if(until<=since||until-since>366*86400000||to>today)throw new Error('Invalid date range');
  return {from,to,since,until};
}

function selected(value,option){return value===option?' selected':'';}
function options(list,value){return list.map(([v,label])=>`<option value="${e(v)}"${selected(value,v)}>${e(label)}</option>`).join('');}
function commonHeaders(res){
  res.setHeader('Cache-Control','private, no-store, max-age=0');
  res.setHeader('X-Robots-Tag','noindex, nofollow, noarchive');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','no-referrer');
  res.setHeader('Content-Security-Policy',"default-src 'none'; style-src 'unsafe-inline'; img-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'");
}

export default async function handler(req,res){
  commonHeaders(res);
  if(req.method!=='GET'){res.statusCode=405;res.setHeader('Allow','GET');return res.end('Method not allowed');}
  const password=process.env.FREEMY_INSIGHTS_PASSWORD||'';
  if(!/^[A-Za-z0-9_-]{43,128}$/.test(password)){res.statusCode=503;return res.end('Private report is not configured.');}
  if(!authorize(req.headers.authorization,password)){
    res.statusCode=401;res.setHeader('WWW-Authenticate','Basic realm="Freemy insights", charset="UTF-8"');return res.end('Authentication required.');
  }
  const token=process.env.FREEMY_VERCEL_TOKEN||'';
  if(!token){res.statusCode=503;return res.end('Analytics access is not configured.');}
  let query,period,filters,type;
  try{
    query=new URL(req.url,'https://freemy.ai').searchParams;
    period=dates(query);
    filters={lang:query.get('lang')||'',page:query.get('page')||'',entry:query.get('entry')||''};
    makeFilter('work_view',filters);
    type=query.get('type')||'';
    if(type&&!read('types').some(t=>t.id===type))throw new Error('Invalid type');
  }catch{res.statusCode=400;return res.end('Invalid report filters.');}

  const all=catalog().filter(w=>!type||w.type===type);
  const starts={work_impression:process.env.FREEMY_IMPRESSIONS_STARTED_AT||'',preview_open:process.env.FREEMY_EVENTS_STARTED_AT||'',work_view:process.env.FREEMY_EVENTS_STARTED_AT||'',experience_open:process.env.FREEMY_EVENTS_STARTED_AT||''};
  const since=new Date(period.since).toISOString(),until=new Date(period.until).toISOString();
  // The aggregate API includes the end timestamp and rounds up to an hour.
  const eventsUntil=new Date(period.until-1).toISOString();
  const tasks=eventNames.map(name=>{
    const start=Date.parse(starts[name]);
    if(!Number.isFinite(start)||start>=period.until)return Promise.resolve(null);
    return getEventCounts({token,name,since,until:eventsUntil,filters});
  });
  const results=await Promise.allSettled([...tasks,getPageTotals({token,since,until})]);
  const maps=Object.fromEntries(eventNames.map((name,i)=>[name,results[i].status==='fulfilled'?results[i].value:undefined]));
  const val=(name,work,field='count')=>metricCell({available:maps[name]!==undefined,since:period.since,until:period.until,start:starts[name],value:maps[name]?.get(work.id)?.[field]??0});
  const rows=all.map(w=>({work:w,values:eventNames.map(name=>val(name,w)),visitors:val('experience_open',w,'visitors')}));
  rows.sort((a,b)=>(Number.parseInt(b.values[3],10)||0)-(Number.parseInt(a.values[3],10)||0)||a.work.title.localeCompare(b.work.title,'zh'));
  if(query.get('format')==='csv'){
    res.setHeader('Content-Type','text/csv; charset=utf-8');res.setHeader('Content-Disposition','attachment; filename="freemy-insights.csv"');
    const lines=[['开始日期 UTC','结束日期 UTC','语言','页面','入口','作品','作品 ID','类型',...eventNames.map(n=>titles[n]),'点击访客估计','作品事件开始 UTC','曝光开始 UTC'],...rows.map(r=>[period.from,period.to,filters.lang||'全部',filters.page||'全部',filters.entry||'全部',r.work.title,r.work.id,r.work.type,...r.values,r.visitors,starts.work_view||'未设置',starts.work_impression||'未启用'])];
    return res.end('\uFEFF'+lines.map(line=>line.map(escapeCsv).join(',')).join('\r\n'));
  }
  const totals=results.at(-1), pageTotals=totals.status==='fulfilled'?`页面浏览 ${e(totals.value.pageviews)} · 访客估计 ${e(totals.value.visitors)}`:'页面统计暂不可用';
  const types=read('types').map(t=>[t.id,t.zh||t.en||t.id]);
  const table=rows.map(({work,values,visitors})=>`<tr><td><div class="work">${work.image?`<img src="${e(work.image)}" alt="">`:''}<div><strong>${e(work.title)}</strong><small>${e(work.id)}</small></div></div></td><td>${e(work.type)}</td>${values.map(v=>`<td>${e(v)}</td>`).join('')}<td>${e(visitors)}</td></tr>`).join('');
  const csv=new URLSearchParams(query);csv.set('format','csv');
  const generated=new Date().toISOString().replace('T',' ').replace('Z',' UTC');
  res.setHeader('Content-Type','text/html; charset=utf-8');
  return res.end(`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Freemy 作品分析</title><style>body{font:15px/1.6 system-ui,sans-serif;color:#202723;background:#f5f6f2;margin:0}main{max-width:1320px;margin:40px auto;padding:0 24px}h1{font-size:30px;margin-bottom:4px}.muted,small{color:#647068}small{display:block}.panel{background:white;border:1px solid #e1e7e0;border-radius:14px;padding:20px;margin:20px 0}.filters{display:flex;flex-wrap:wrap;align-items:end;gap:12px}label{display:grid;gap:4px}input,select,button,.download{font:inherit;padding:8px;border:1px solid #cbd5cb;border-radius:7px;background:white;color:inherit}button,.download{background:#183d2f;color:white;cursor:pointer;text-decoration:none}.scroll{overflow-x:auto}table{border-collapse:collapse;width:100%;white-space:nowrap}th,td{text-align:left;padding:12px;border-bottom:1px solid #edf0ec}th{font-size:13px;color:#647068}.work{display:flex;align-items:center;gap:10px}.work img{width:70px;height:48px;object-fit:cover;border-radius:6px}p{margin:8px 0}</style></head><body><main><h1>作品表现</h1><p class="muted">私有统计 · UTC 时间 · 生成于 ${e(generated)}</p><div class="panel"><strong>网站整体</strong><p>${pageTotals}</p><small>整体数据不受作品筛选影响；访客为 Vercel 的去重估计，不代表已验证的自然人。</small></div><form class="panel filters" method="get"><label>开始日期（UTC）<input type="date" name="from" value="${e(period.from)}"></label><label>结束日期（UTC）<input type="date" name="to" value="${e(period.to)}"></label><label>语言<select name="lang">${options([['','全部'],['en','英文'],['zh','中文']],filters.lang)}</select></label><label>作品类型<select name="type">${options([['','全部'],...types],type)}</select></label><label>页面<select name="page">${options([['','全部'],['home','首页'],['explore','发现'],['type','类型'],['topic','主题'],['collection','合集'],['work','作品详情']],filters.page)}</select></label><label>入口<select name="entry">${options([['','全部'],['card','卡片'],['dialog','预览弹窗'],['detail','详情'],['related','相关推荐']],filters.entry)}</select></label><button>应用筛选</button><a class="download" href="?${e(csv.toString())}">下载汇总 CSV</a></form><div class="panel"><p>作品数据排除带 QA 标记的内部测试；Vercel 原生总数可能包含少量 QA 事件。原站点击表示打开原站的意愿，不代表完成体验。</p><p>“未采集”表示该时段尚未启用；“不可用”表示统计查询失败。数字后的 * 表示所选时段包含未采集的部分，不代表完整历史。</p><p>作品事件开始时间：${e(starts.work_view||'尚未设置')}；曝光开始时间：${e(starts.work_impression||'尚未启用')}。平台汇总可能延迟。</p><div class="scroll"><table><thead><tr><th>作品</th><th>类型</th>${eventNames.map(n=>`<th>${titles[n]}</th>`).join('')}<th>点击访客估计</th></tr></thead><tbody>${table}</tbody></table></div></div></main></body></html>`);
}
