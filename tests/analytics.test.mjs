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

test('source and learning clicks send only bounded work and location data', () => {
  const sent=[], track=createTracker({enabled:true,origin:'https://freemy.ai',mode:'qa',send:(...args)=>sent.push(args)});
  assert.equal(track('source_open',{work_id:'tree-appreciator',locale:'en',page_type:'home',placement:'source-github-card',url:'https://private.example/source'}),true);
  assert.equal(track('learning_open',{work_id:'tree-appreciator',locale:'zh',page_type:'work',placement:'learning-note-detail',query:'private search'}),true);
  assert.deepEqual(sent,[
    ['event',{name:'source_open',data:{work_id:'tree-appreciator',placement:'qa:en:home:source-github-card'}}],
    ['event',{name:'learning_open',data:{work_id:'tree-appreciator',placement:'qa:zh:work:learning-note-detail'}}]
  ]);
  assert.equal(track('source_open',{locale:'en',page_type:'home',placement:'source-github-card'}),false,'a work ID is required');
  assert.equal(track('learning_open',{work_id:'tree-appreciator',locale:'zh',page_type:'work',placement:'user-supplied-text'}),false,'placement is a bounded value');
  assert.equal(track('source_open',{work_id:'tree-appreciator',locale:'en',page_type:'user-supplied-text',placement:'source-github-card'}),false,'page type is a bounded value');
  assert.equal(track('source_open',{work_id:'tree-appreciator',locale:'user-supplied-text',page_type:'home',placement:'source-github-card'}),false,'language is a bounded value');
  assert.equal(track('source_open',{work_id:'tree-appreciator',locale:'en',page_type:'home',placement:'learning-note-card'}),false,'learning placement cannot be sent as a source click');
  assert.equal(createTracker({enabled:true,origin:'https://freemy.ai',mode:'off',send:()=>assert.fail()})('source_open',{work_id:'tree-appreciator',page_type:'home',placement:'source-github-card'}),false);
  assert.equal(createTracker({enabled:true,origin:'http://localhost:4177',send:()=>assert.fail()})('learning_open',{work_id:'tree-appreciator',page_type:'home',placement:'learning-guide-card'}),false);
  assert.equal(createTracker({enabled:true,origin:'https://freemy.ai',send:()=>{throw new Error('blocked')}})('source_open',{work_id:'tree-appreciator',locale:'en',page_type:'home',placement:'source-github-card'}),false,'statistics failure does not throw');
});

test('supported source providers and learning types work in all interface locations', () => {
  const track=createTracker({enabled:true,origin:'https://freemy.ai'});
  const examples=[
    ['source_open','source-github-card'],['source_open','source-huggingface-dialog'],
    ['source_open','source-other-detail'],['source_open','source-github-related'],
    ['learning_open','learning-note-card'],['learning_open','learning-guide-dialog'],
    ['learning_open','learning-note-detail'],['learning_open','learning-guide-related']
  ];
  for(const [name,placement] of examples){
    assert.equal(track(name,{work_id:'tree-appreciator',locale:'en',page_type:'work',placement}),true,placement);
  }
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
