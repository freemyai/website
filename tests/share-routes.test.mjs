import test from 'node:test';
import assert from 'node:assert/strict';

const mod=await import('../scripts/sync-share-routes.mjs').catch(error=>{
  if(error.code==='ERR_MODULE_NOT_FOUND')return {};
  throw error;
});
const manifest=[
  {workId:'hydraulics',locale:'en',shareSlug:'hydraulics',sharePath:'/hydraulics/',canonicalPath:'/en/works/hydraulics/',previousSlugs:['old-hydraulics']},
  {workId:'hydraulics',locale:'zh',shareSlug:'hydraulics',sharePath:'/zh/hydraulics/',canonicalPath:'/works/hydraulics/',previousSlugs:['old-hydraulics']}
];
const routes=()=>{
  assert.equal(typeof mod.buildShareRedirects,'function','redirect generator must exist');
  return mod.buildShareRedirects(manifest);
};

test('generates exact bilingual permanent routes for current and previous aliases',()=>{
  const result=routes();
  for(const [source,destination] of [['/hydraulics/','/en/works/hydraulics/'],['/hydraulics','/en/works/hydraulics/'],['/zh/hydraulics/','/works/hydraulics/'],['/zh/old-hydraulics','/works/hydraulics/']]){
    assert.deepEqual(result.find(r=>r.source===source),{source,destination,permanent:true});
  }
  assert.equal(result.length,8);
  assert.ok(result.every(r=>!r.source.includes(':')&&!r.source.includes('*')&&r.destination.startsWith('/')));
});

test('preserves unrelated settings and refuses changes to managed or conflicting routes',()=>{
  const keep={source:'/en',destination:'/',permanent:true};
  const config={cleanUrls:true,trailingSlash:true,functions:{'api/insights.mjs':{includeFiles:'data/*.json'}},headers:[{source:'/(.*)',headers:[]}],redirects:[keep]};
  assert.equal(typeof mod.mergeShareRedirects,'function');
  const generated=routes(), merged=mod.mergeShareRedirects(config,[],generated);
  assert.deepEqual(merged.redirects[0],keep);
  assert.deepEqual(merged.functions,config.functions);assert.deepEqual(merged.headers,config.headers);
  assert.equal(merged.cleanUrls,true);assert.equal(merged.trailingSlash,true);
  assert.deepEqual(mod.mergeShareRedirects(merged,generated,generated),merged);
  assert.throws(()=>mod.mergeShareRedirects({...config,redirects:[keep,{source:'/hydraulics/',destination:'/elsewhere/',permanent:true}]},[],generated),/conflict/i);
  const tampered=structuredClone(merged);tampered.redirects.find(r=>r.source==='/hydraulics/').destination='/elsewhere/';
  assert.throws(()=>mod.mergeShareRedirects(tampered,generated,generated),/managed|changed/i);
});

test('refuses arbitrary or external redirect destinations',()=>{
  assert.equal(typeof mod.buildShareRedirects,'function');
  for(const target of ['https://evil.example/','//evil.example/','/contact/','/works/../../api/']){
    const bad=structuredClone(manifest);bad[0].canonicalPath=target;
    assert.throws(()=>mod.buildShareRedirects(bad),/invalid|canonical/i);
  }
});

test('historical aliases cannot be dropped or reassigned to another creation',()=>{
  assert.equal(typeof mod.mergeShareHistory,'function');
  const old={version:1,owners:{hydraulics:'hydraulics',retired:'old-work'}};
  const registry={version:1,entries:[{work_id:'hydraulics',share_slug:'hydraulics',previous_slugs:['new-name'],state:'active'},{work_id:'old-work',share_slug:'retired',previous_slugs:[],state:'retired'}]};
  assert.equal(mod.mergeShareHistory(registry,old).owners['new-name'],'hydraulics');
  const missing=structuredClone(registry);missing.entries.pop();
  assert.throws(()=>mod.mergeShareHistory(missing,old),/historical|removed/i);
  const reassigned=structuredClone(registry);reassigned.entries[1].work_id='different-work';
  assert.throws(()=>mod.mergeShareHistory(reassigned,old),/historical|reassign/i);
});
