import test from 'node:test';
import assert from 'node:assert/strict';
import { createTracker } from '../assets/analytics.mjs';
import { makeFilter, getEventCounts } from '../api/_insights-core.mjs';
import handler from '../api/insights.mjs';

test('share events contain only bounded work and placement metadata',()=>{
  const sent=[],track=createTracker({enabled:true,origin:'https://freemy.ai',mode:'qa',send:(...args)=>sent.push(args)});
  assert.equal(track('share_menu_open',{work_id:'hydraulics',locale:'zh',page_type:'home',placement:'card',email:'private@example.com'}),true);
  assert.equal(track('share_copy',{work_id:'hydraulics',locale:'zh',page_type:'home',placement:'card-en',url:'https://private.example/'}),true);
  assert.equal(track('share_native_return',{work_id:'hydraulics',locale:'en',page_type:'work',placement:'detail-en'}),true);
  assert.equal(track('share_x_open',{work_id:'hydraulics',locale:'en',page_type:'work',placement:'detail'}),true);
  assert.equal(track('share_qr_open',{work_id:'hydraulics',locale:'zh',page_type:'home',placement:'dialog-en'}),true);
  assert.deepEqual(sent[1][1].data,{work_id:'hydraulics',placement:'qa:zh:home:card-en'});
  assert.equal(track('share_copy',{work_id:'hydraulics',locale:'en',page_type:'home',placement:'private-text'}),false);
  assert.equal(track('share_copy',{locale:'en',page_type:'home',placement:'card-en'}),false);
  assert.equal(track('share_copy',{work_id:'hydraulics',locale:'en',page_type:'private-page',placement:'card-en'}),false);
  assert.equal(createTracker({enabled:true,origin:'https://freemy.ai',mode:'off',send:()=>assert.fail()})('share_copy',{work_id:'hydraulics',locale:'en',page_type:'home',placement:'card-en'}),false);
});

test('contact events do not contain addresses or email content',()=>{
  const sent=[],track=createTracker({enabled:true,origin:'https://freemy.ai',send:(...args)=>sent.push(args)});
  assert.equal(track('contact_click',{locale:'en',page_type:'contact',placement:'contact',email:'ai@freemy.ai',body:'private'}),true);
  assert.equal(track('contact_copy',{locale:'zh',page_type:'contact',placement:'contact',value:'ai@freemy.ai'}),true);
  assert.equal(track('contact_click',{work_id:'hydraulics',locale:'en',page_type:'work',placement:'detail'}),true);
  assert.deepEqual(sent[0][1].data,{placement:'en:contact:contact'});
  assert.ok(!JSON.stringify(sent).includes('ai@freemy.ai'));
  assert.equal(track('contact_click',{locale:'en',page_type:'work',placement:'detail'}),false);
  assert.equal(track('contact_copy',{locale:'en',page_type:'contact',placement:'private-text'}),false);
});

test('private report filters retain QA exclusion and understand language-specific share placement',async()=>{
  const filter=makeFilter('share_copy',{lang:'en',page:'home',entry:'card'});
  assert.match(filter,/not startswith\(eventData\/placement,'qa:'\)/);
  assert.match(filter,/contains\(eventData\/placement,':card-'\)/);
  let requested;
  const data=await getEventCounts({token:'test',name:'contact_copy',since:'2026-11-18',until:'2026-11-19',filters:{},groupBy:'placement',fetchImpl:async url=>{requested=new URL(url);return {ok:true,json:async()=>({data:[{'eventData/placement':'en:contact:contact',count:2,visitors:1}]})};}});
  assert.equal(requested.searchParams.get('by'),'eventData/placement');
  assert.equal(data.get('en:contact:contact').count,2);
});

test('private report identifies share and contact activity without claiming delivery',async()=>{
  const keys=['FREEMY_INSIGHTS_PASSWORD','FREEMY_VERCEL_TOKEN','FREEMY_EVENTS_STARTED_AT','FREEMY_IMPRESSIONS_STARTED_AT','FREEMY_LEARNING_EVENTS_STARTED_AT','FREEMY_SHARE_EVENTS_STARTED_AT'];
  const previous=Object.fromEntries(keys.map(key=>[key,process.env[key]])), oldFetch=globalThis.fetch;
  const secret='D8iVEq57FBmhPCmAC18OC7UKcZP6Hx9LYszs2xYCj4A';
  const auth=`Basic ${Buffer.from(`freemy:${secret}`).toString('base64')}`;
  const response=()=>({statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v;},end(v){this.body=v;}});
  try{
    process.env.FREEMY_INSIGHTS_PASSWORD=secret;process.env.FREEMY_VERCEL_TOKEN='test-only';
    process.env.FREEMY_EVENTS_STARTED_AT='2026-11-01T00:00:00Z';process.env.FREEMY_SHARE_EVENTS_STARTED_AT='2026-11-17T12:00:00Z';
    globalThis.fetch=async url=>{
      const u=new URL(url);
      if(u.pathname.endsWith('/visits/count'))return {ok:true,json:async()=>({data:{pageviews:12,visitors:4}})};
      if(u.searchParams.get('by')==='eventData/placement')return {ok:true,json:async()=>({data:[{'eventData/placement':'en:contact:contact',count:2,visitors:1}]})};
      return {ok:true,json:async()=>({data:[{'eventData/work_id':'hydraulics',count:4,visitors:1}]})};
    };
    const res=response();await handler({method:'GET',url:'/api/insights?from=2026-11-16&to=2026-11-17',headers:{authorization:auth}},res);
    assert.equal(res.statusCode,200);assert.match(res.body,/分享复制/);assert.match(res.body,/系统分享/);assert.match(res.body,/联系点击/);
    assert.match(res.body,/不代表已发布|不代表已发送/);assert.match(res.body,/联系点击 2\*/);
    assert.doesNotMatch(res.body,/test-only/);
  }finally{
    for(const key of keys){if(previous[key]===undefined)delete process.env[key];else process.env[key]=previous[key];}
    globalThis.fetch=oldFetch;
  }
});
