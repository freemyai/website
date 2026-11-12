import test from 'node:test';
import assert from 'node:assert/strict';
import { createTracker, createImpressionMonitor } from '../assets/analytics.mjs';

test('custom events are restricted to permitted fields and the production origin', () => {
  const sent=[], track=createTracker({enabled:true,origin:'https://freemy.ai',send:(...args)=>sent.push(args)});
  assert.equal(track('preview_open',{work_id:'hydraulics',locale:'en',page_type:'home',placement:'card',query:'private text'}),true);
  assert.deepEqual(sent,[['event',{name:'preview_open',data:{work_id:'hydraulics',placement:'en:home:card'}}]]);
  assert.equal(track('unknown',{work_id:'hydraulics'}),false);
  assert.equal(createTracker({enabled:true,origin:'http://localhost:4177',send:()=>assert.fail()})('experience_open',{}),false);
  assert.equal(createTracker({enabled:false,origin:'https://freemy.ai',send:()=>assert.fail()})('experience_open',{}),false);
});

test('analytics errors never prevent a user action', () => {
  const track=createTracker({enabled:true,origin:'https://freemy.ai',send:()=>{throw new Error('blocked')}});
  assert.doesNotThrow(()=>track('related_click',{locale:'zh',page_type:'work',placement:'related'}));
  assert.equal(track('related_click',{locale:'zh',page_type:'work',placement:'related'}),false);
});

test('work views share one stable ID between languages and QA is identifiable', () => {
  const sent=[];
  const track=createTracker({enabled:true,origin:'https://freemy.ai',mode:'qa',send:(...args)=>sent.push(args)});
  for(const locale of ['en','zh']) assert.equal(track('work_view',{work_id:'hydraulics',locale,page_type:'work',placement:'detail'}),true);
  assert.deepEqual(sent.map(([,event])=>event.data),[
    {work_id:'hydraulics',placement:'qa:en:work:detail'},
    {work_id:'hydraulics',placement:'qa:zh:work:detail'}
  ]);
  assert.equal(createTracker({enabled:true,origin:'https://freemy.ai',mode:'off',send:()=>assert.fail()})('work_view',{work_id:'hydraulics'}),false);
  assert.equal(track('work_view',{work_id:'not a valid id',locale:'en'}),false);
});

test('impressions need continuous foreground visibility and deduplicate by work', () => {
  let nextId=0;
  const timers=new Map(), sent=[];
  const monitor=createImpressionMonitor({
    onImpression:(...args)=>sent.push(args),
    setTimer:(fn,delay)=>{assert.equal(delay,1000);const id=++nextId;timers.set(id,fn);return id;},
    clearTimer:id=>timers.delete(id),
    isStillVisible:target=>target.visible
  });
  const a={visible:true},b={visible:true};
  const fire=()=>{const callbacks=[...timers.values()];timers.clear();callbacks.forEach(fn=>fn());};
  monitor.update(a,{workId:'hydraulics',placement:'card',ratio:0.49});
  assert.equal(timers.size,0,'below half is not visible enough');
  monitor.update(a,{workId:'hydraulics',placement:'card',ratio:0.5});
  assert.equal(timers.size,1);
  monitor.update(a,{workId:'hydraulics',placement:'card',ratio:0.49});
  assert.equal(timers.size,0,'leaving the viewport cancels the full second');
  monitor.update(a,{workId:'hydraulics',placement:'card',ratio:0.9});
  monitor.suspend();
  assert.equal(timers.size,0,'backgrounding cancels the pending exposure');
  monitor.resume();
  assert.equal(timers.size,0,'resuming requires a fresh visibility observation');
  monitor.update(a,{workId:'hydraulics',placement:'card',ratio:1});
  a.visible=false;fire();
  assert.deepEqual(sent,[],'hidden search results do not count');
  a.visible=true;monitor.update(a,{workId:'hydraulics',placement:'card',ratio:1});fire();
  assert.deepEqual(sent,[['hydraulics','card']]);
  monitor.update(b,{workId:'hydraulics',placement:'related',ratio:1});
  assert.equal(timers.size,0,'same creation is counted only once per page');
  monitor.update(b,{workId:'other-work',placement:'related',ratio:1});fire();
  assert.deepEqual(sent,[['hydraulics','card'],['other-work','related']]);
});
