import test from 'node:test';
import assert from 'node:assert/strict';

const mod=await import('../src/share-links.mjs').catch(error=>{
  if(error.code==='ERR_MODULE_NOT_FOUND')return {};
  throw error;
});
const work=(id,slug=id,status='published')=>({id,slug,editorial:{status}});
const catalogue={works:[work('hydraulics'),work('tree-appreciator')]};
const entries=[
  {work_id:'hydraulics',share_slug:'hydraulics',previous_slugs:['old-hydraulics'],state:'active'},
  {work_id:'tree-appreciator',share_slug:'tree-appreciator',previous_slugs:[],state:'active'}
];
const registry=()=>({version:1,entries:structuredClone(entries)});
const pages=[
  {path:'/'},{path:'/zh/'},{path:'/contact/'},{path:'/en/contact/'},
  ...catalogue.works.flatMap(w=>[{path:`/works/${w.slug}/`},{path:`/en/works/${w.slug}/`}])
];
const build=(c=catalogue,r=registry(),p=pages)=>{
  assert.equal(typeof mod.buildShareManifest,'function','share manifest builder must exist');
  return mod.buildShareManifest(c,r,p);
};

test('one stable alias per published work yields bilingual in-domain detail paths',()=>{
  const result=build(), en=result.find(x=>x.workId==='hydraulics'&&x.locale==='en'), zh=result.find(x=>x.workId==='hydraulics'&&x.locale==='zh');
  assert.equal(en.sharePath,'/hydraulics/');assert.equal(en.canonicalPath,'/en/works/hydraulics/');
  assert.equal(zh.sharePath,'/zh/hydraulics/');assert.equal(zh.canonicalPath,'/works/hydraulics/');
  assert.equal(mod.shareUrlFor(en),'https://freemy.ai/hydraulics/');
  assert.equal(mod.shareUrlFor(zh),'https://freemy.ai/zh/hydraulics/');
  assert.deepEqual(build(catalogue,{version:1,entries:registry().entries.reverse()}),result);
});

test('rejects duplicate, retired, reserved, invalid and already occupied aliases',()=>{
  for(const invalid of ['contact','api','en','assets','_vercel','A','-bad','a--b','https://bad.example','bad/child','a'.repeat(81)]){
    const r=registry();r.entries[0].share_slug=invalid;
    assert.throws(()=>build(catalogue,r,pages),/alias|slug|reserved|invalid/i,invalid);
  }
  const duplicate=registry();duplicate.entries[1].share_slug='hydraulics';
  assert.throws(()=>build(catalogue,duplicate),/duplicate|already/i);
  const reused=registry();reused.entries.push({work_id:'removed-work',share_slug:'retired-name',previous_slugs:['tree-appreciator'],state:'retired'});
  assert.throws(()=>build(catalogue,reused),/duplicate|already/i);
  const occupied=registry();occupied.entries[0].share_slug='existing-page';
  assert.throws(()=>build(catalogue,occupied,[...pages,{path:'/existing-page/'}]),/conflict|occupied|reserved/i);
});

test('only published known works can be active and each published work needs an alias',()=>{
  const unknown=registry();unknown.entries[0].work_id='no-such-work';
  assert.throws(()=>build(catalogue,unknown),/unknown|published/i);
  const missing=registry();missing.entries.pop();
  assert.throws(()=>build(catalogue,missing),/missing|alias/i);
  const draft={works:[...catalogue.works,work('draft','draft','candidate')]};
  const r=registry();r.entries.push({work_id:'draft',share_slug:'draft',previous_slugs:[],state:'active'});
  assert.throws(()=>build(draft,r),/published/i);
  const malicious=registry();malicious.entries[0].destination='https://bad.example/';
  assert.throws(()=>build(catalogue,malicious),/field|invalid/i);
});
