import test from 'node:test';
import assert from 'node:assert/strict';

const mod=await import('../assets/share.mjs').catch(error=>{
  if(error.code==='ERR_MODULE_NOT_FOUND')return {};
  throw error;
});
const payload={workId:'hydraulics',titleZh:'液压原理',titleEn:'Hydraulics',summaryZh:'探索液压',summaryEn:'Explore hydraulics',shareUrlZh:'https://freemy.ai/zh/hydraulics/',shareUrlEn:'https://freemy.ai/hydraulics/'};
const controller=options=>{
  assert.equal(typeof mod.createShareController,'function','share controller must exist');
  return mod.createShareController(options);
};

test('copies the selected creation and language only after clipboard success',async()=>{
  const writes=[],events=[],notices=[];
  const c=controller({copyText:async value=>writes.push(value),track:(...x)=>events.push(x),notify:(...x)=>notices.push(x)});
  assert.deepEqual(await c.copy(payload,'zh'),{status:'copied',url:'https://freemy.ai/zh/hydraulics/'});
  assert.deepEqual(writes,['https://freemy.ai/zh/hydraulics/']);
  assert.equal(events[0][0],'share_copy');assert.equal(notices[0][0],'copied');
  assert.equal((await c.copy(payload,'en')).url,'https://freemy.ai/hydraulics/');
});

test('clipboard failure or lack of support exposes the URL without a success event',async()=>{
  for(const copyText of [undefined,async()=>{throw new Error('denied');}]){
    const events=[],notices=[];
    const c=controller({copyText,track:(...x)=>events.push(x),notify:(...x)=>notices.push(x)});
    assert.deepEqual(await c.copy(payload,'en'),{status:'manual',url:'https://freemy.ai/hydraulics/'});
    assert.equal(events.length,0);assert.equal(notices[0][0],'manual');
  }
});

test('native share starts immediately, treats cancel silently and never means published',async()=>{
  let called=false;const events=[],notices=[];
  const c=controller({nativeShare:async value=>{called=true;assert.equal(value.url,payload.shareUrlEn);},track:(...x)=>events.push(x),notify:(...x)=>notices.push(x)});
  const pending=c.native(payload,'en');assert.equal(called,true,'native share is invoked in the user gesture');
  assert.deepEqual(await pending,{status:'returned'});assert.equal(events[0][0],'share_native_return');
  const cancelled=controller({nativeShare:async()=>{throw Object.assign(new Error('cancel'),{name:'AbortError'});},notify:(...x)=>notices.push(x)});
  assert.deepEqual(await cancelled.native(payload,'en'),{status:'cancelled'});assert.equal(notices.length,0);
  const failed=controller({nativeShare:async()=>{throw Object.assign(new Error('denied'),{name:'NotAllowedError'});}});
  assert.deepEqual(await failed.native(payload,'en'),{status:'failed'});
  assert.deepEqual(await controller({}).native(payload,'en'),{status:'unsupported'});
});

test('X opens a prefilled draft for the chosen work; arbitrary destinations are rejected',()=>{
  assert.equal(typeof mod.xIntentUrl,'function');
  const u=new URL(mod.xIntentUrl(payload,'zh'));
  assert.equal(u.hostname,'x.com');assert.equal(u.pathname,'/intent/tweet');
  assert.equal(u.searchParams.get('url'),payload.shareUrlZh);assert.match(u.searchParams.get('text'),/液压原理/);
  assert.throws(()=>mod.xIntentUrl({...payload,shareUrlZh:'https://evil.example/'},'zh'),/invalid/i);
});

test('generic copy helper returns manual fallback without reporting a success',async()=>{
  assert.equal(typeof mod.copyValue,'function');
  const result=await mod.copyValue('ai@freemy.ai',{copyText:async()=>{throw new Error('denied');}});
  assert.deepEqual(result,{status:'manual',value:'ai@freemy.ai'});
  const written=[];
  assert.deepEqual(await mod.copyValue('ai@freemy.ai',{copyText:async value=>written.push(value)}),{status:'copied',value:'ai@freemy.ai'});
  assert.deepEqual(written,['ai@freemy.ai']);
});
