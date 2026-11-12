import test from 'node:test';
import assert from 'node:assert/strict';
import { createTracker } from '../assets/analytics.mjs';

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
