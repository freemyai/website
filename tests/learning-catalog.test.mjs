import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadCatalog, root } from '../src/validate.mjs';
import { filterWorks } from '../src/catalog.mjs';

const seeds=JSON.parse(fs.readFileSync(path.join(root,'data/candidates/source-discovery/handoff-seeds.json'),'utf8'));
function readWith(records){
  return name=>name==='learning-resources.json'?{schema_version:1,base_commit:seeds.base_commit,records}:name==='open-source-license-policy.json'?{allowedLicenses:['Apache-2.0','MIT']}:JSON.parse(fs.readFileSync(path.join(root,'data',name),'utf8'));
}
function approvedTree(){
  const record=structuredClone(seeds.records[0]);record.sources[0].publication='published';return record;
}

test('catalog attaches only verified public actions to merged work IDs',()=>{
  const c=loadCatalog({readData:readWith([approvedTree()])});
  const tree=c.works.find(w=>w.id==='tree-appreciator');
  assert.equal(tree.hasOpenSource,true);
  assert.equal(tree.hasLearningNote,false);
  assert.equal(tree.learningPublic.en.actions[0].href,'https://github.com/simonw/tools/blob/main/tree-appreciator.html');
  assert.ok(!JSON.stringify(tree.learningPublic).includes('Repository metadata'));
  const candidate=approvedTree();candidate.sources[0].publication='candidate';
  const hidden=loadCatalog({readData:readWith([candidate])}).works.find(w=>w.id==='tree-appreciator');
  assert.equal(hidden.hasOpenSource,false);
  assert.deepEqual(hidden.learningPublic.en.actions,[]);
});

test('catalog rejects unknown works and duplicate resource identities across records',()=>{
  const unknown={...approvedTree(),work_id:'not-a-real-work'};
  assert.throws(()=>loadCatalog({readData:readWith([unknown])}),/unknown work/i);
  assert.throws(()=>loadCatalog({readData:readWith([approvedTree(),approvedTree()])}),/duplicate.*work/i);
  const second={...approvedTree(),work_id:'harmonograph'};
  assert.throws(()=>loadCatalog({readData:readWith([approvedTree(),second])}),/duplicate.*resource/i);
  second.sources[0].id='different-resource';
  assert.doesNotThrow(()=>loadCatalog({readData:readWith([approvedTree(),second])}));
});

test('only verified technical tags with evidence participate in search',()=>{
  const record=approvedTree();
  record.technical_tags=[{id:'webgl',status:'verified',label:{zh:'WebGL',en:'WebGL'},evidence_url:'https://github.com/simonw/tools/blob/main/tree-appreciator.html'}];
  const c=loadCatalog({readData:readWith([record])});
  assert.ok(filterWorks(c.works,{q:'WebGL'}).some(w=>w.id==='tree-appreciator'));
  record.technical_tags[0].evidence_url='javascript:alert(1)';
  assert.throws(()=>loadCatalog({readData:readWith([record])}),/technical tag/i);
});
