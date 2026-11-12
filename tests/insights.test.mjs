import test from 'node:test';
import assert from 'node:assert/strict';
import { authorize, makeFilter, metricCell, escapeCsv, getEventCounts } from '../api/_insights-core.mjs';
import handler from '../api/insights.mjs';

test('private report requires a strong configured secret and matching credentials',()=>{
  const secret='D8iVEq57FBmhPCmAC18OC7UKcZP6Hx9LYszs2xYCj4A';
  const basic=(user,password)=>`Basic ${Buffer.from(`${user}:${password}`).toString('base64')}`;
  assert.equal(authorize(basic('freemy',secret),''),false);
  assert.equal(authorize(basic('freemy','short'),'short'),false);
  assert.equal(authorize(basic('other',secret),secret),false);
  assert.equal(authorize(basic('freemy',secret+'x'),secret),false);
  assert.equal(authorize(basic('freemy',secret),secret),true);
});

test('filters exclude QA traffic while matching language and location',()=>{
  const filter=makeFilter('experience_open',{lang:'en',page:'home',entry:'card'});
  assert.match(filter,/not startswith\(eventData\/placement,'qa:'\)/);
  assert.match(filter,/startswith\(eventData\/placement,'en:'\)/);
  assert.match(filter,/contains\(eventData\/placement,':home:'\)/);
  assert.match(filter,/endswith\(eventData\/placement,':card'\)/);
  assert.throws(()=>makeFilter('experience_open',{lang:"en' or true"}));
});

test('uncollected intervals and provider errors cannot masquerade as zero',()=>{
  const since=Date.parse('2026-11-01T00:00:00Z'),until=Date.parse('2026-11-20T00:00:00Z');
  assert.equal(metricCell({available:false,since,until,start:'2026-11-10T00:00:00Z',value:0}),'不可用');
  assert.equal(metricCell({available:true,since,until,start:null,value:0}),'未采集');
  assert.equal(metricCell({available:true,since,until,start:'2026-12-01T00:00:00Z',value:0}),'未采集');
  assert.equal(metricCell({available:true,since,until,start:'2026-11-10T00:00:00Z',value:0}),'0*');
  assert.equal(metricCell({available:true,since,until,start:'2026-10-01T00:00:00Z',value:0}),'0');
  assert.equal(metricCell({available:true,since,until,start:'2026-10-01T00:00:00Z',value:undefined}),'不可用');
  assert.equal(escapeCsv('=HYPERLINK("x")'), '"\'=HYPERLINK(""x"")"');
});

test('reporting uses one grouped query for deduplicated visitors and surfaces API errors',async()=>{
  let request;
  const fake=async(url,options)=>{request={url:new URL(url),options};return {ok:true,json:async()=>({data:[{'eventData/work_id':'hydraulics',count:3,visitors:1}]})};};
  const data=await getEventCounts({fetchImpl:fake,token:'not-public',name:'experience_open',since:'2026-11-11T00:00:00Z',until:'2026-11-12T00:00:00Z',filters:{}});
  assert.equal(data.get('hydraulics').visitors,1);
  assert.equal(data.get('hydraulics').count,3);
  assert.equal(request.url.searchParams.get('by'),'eventData/work_id');
  assert.match(request.url.searchParams.get('filter'),/not startswith/);
  assert.equal(request.options.headers.Authorization,'Bearer not-public');
  await assert.rejects(getEventCounts({fetchImpl:async()=>({ok:false,status:403}),token:'secret',name:'work_view',since:'2026-11-11',until:'2026-11-12',filters:{}}));
});

test('the private endpoint fails closed and only serves authenticated aggregated data',async()=>{
  const previous={...process.env},oldFetch=globalThis.fetch;
  const secret='D8iVEq57FBmhPCmAC18OC7UKcZP6Hx9LYszs2xYCj4A',token='test-only-server-secret';
  const auth=`Basic ${Buffer.from(`freemy:${secret}`).toString('base64')}`;
  const response=()=>({statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v;},end(v){this.body=v;}});
  try{
    delete process.env.FREEMY_INSIGHTS_PASSWORD;
    let res=response();await handler({method:'GET',url:'/api/insights',headers:{authorization:auth}},res);
    assert.equal(res.statusCode,503);
    process.env.FREEMY_INSIGHTS_PASSWORD=secret;process.env.FREEMY_VERCEL_TOKEN=token;
    process.env.FREEMY_EVENTS_STARTED_AT='2026-11-12T00:00:00Z';delete process.env.FREEMY_IMPRESSIONS_STARTED_AT;
    res=response();await handler({method:'GET',url:'/api/insights',headers:{}},res);
    assert.equal(res.statusCode,401);assert.match(res.headers['WWW-Authenticate'],/^Basic/);
    globalThis.fetch=async url=>{
      const parsed=new URL(url);
      if(parsed.pathname.endsWith('/visits/count'))return {ok:true,json:async()=>({data:{pageviews:12,visitors:4}})};
      return {ok:true,json:async()=>({data:[{eventData:'hydraulics',count:3,visitors:1}]})};
    };
    res=response();await handler({method:'GET',url:'/api/insights?from=2026-11-11&to=2026-11-12',headers:{authorization:auth}},res);
    assert.equal(res.statusCode,200);assert.match(res.headers['Cache-Control'],/no-store/);
    assert.match(res.body,/液压/);assert.match(res.body,/>3\*</);assert.match(res.body,/>1\*</);assert.match(res.body,/未采集/);
    assert.doesNotMatch(res.body,new RegExp(token));assert.doesNotMatch(res.body,new RegExp(secret));
    res=response();await handler({method:'GET',url:'/api/insights?from=2026-11-11&to=2026-11-12&format=csv',headers:{authorization:auth}},res);
    assert.match(res.headers['Content-Type'],/text\/csv/);assert.match(res.body,/hydraulics/);
  }finally{
    for(const key of ['FREEMY_INSIGHTS_PASSWORD','FREEMY_VERCEL_TOKEN','FREEMY_EVENTS_STARTED_AT','FREEMY_IMPRESSIONS_STARTED_AT']){
      if(previous[key]===undefined)delete process.env[key];else process.env[key]=previous[key];
    }
    globalThis.fetch=oldFetch;
  }
});
