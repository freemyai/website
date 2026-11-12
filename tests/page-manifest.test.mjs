import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPageManifest } from '../src/page-manifest.mjs';
import { loadCatalog, root } from '../src/validate.mjs';
import fs from 'node:fs';
import path from 'node:path';

const text = { title:'Title', summary:'Summary', action:'Start', why:'Why', limit:'Limits' };
const published = { id:'sample', slug:'sample', type:'experiments', primary_category:'physics', editorial:{status:'published'}, locales:{zh:text,en:text} };
const catalog = () => ({
  works:[published, {...published,id:'draft',slug:'draft',editorial:{status:'candidate'}}, {...published,id:'reference',slug:'reference',type:'learning',ai_provenance:{status:'unknown'}}, {...published,id:'unavailable',slug:'unavailable',verification:{availability:'unavailable'}}],
  gallery:[published],
  types:[{id:'experiments'},{id:'games'}],
  collections:[{id:'some',works:['sample']},{id:'empty',works:[]}],
  taxonomy:{categories:[{id:'physics'},{id:'empty'}]}
});

test('manifest records canonical localized paths and explicit indexing policy', () => {
  const pages=buildPageManifest(catalog()), get=key=>pages.find(p=>p.key===key);
  assert.equal(get('home:en').path,'/');
  assert.equal(get('home:zh').path,'/zh/');
  assert.equal(get('work:sample:en').path,'/en/works/sample/');
  assert.equal(get('work:sample:zh').path,'/works/sample/');
  assert.equal(get('work:reference:en').indexable,true);
  assert.equal(get('work:unavailable:en').indexable,true);
  assert.equal(get('work:draft:en'),undefined);
  for (const key of ['type:games:en','topic:empty:zh','collection:empty:en','privacy:en','submit:zh','notFound:en']) {
    assert.equal(get(key).indexable,false,key);
    assert.equal(get(key).includeInSitemap,false,key);
  }
  assert.equal(get('topic:physics:en').indexable,true);
  assert.equal(get('about:en').includeInSitemap,true);
  assert.equal(pages.some(p=>p.path==='/en/'),false);
});

test('manifest rejects missing published translations and duplicate paths', () => {
  const missing=catalog();missing.works=[{...published,locales:{zh:text}}];
  assert.throws(()=>buildPageManifest(missing),/translation/i);
  const duplicate=catalog();duplicate.types.push({id:'experiments'});
  assert.throws(()=>buildPageManifest(duplicate),/duplicate/i);
});

test('last modification is retained only when an explicit content date exists', () => {
  const c=catalog();c.works=[{...published,seo:{en:{updated_at:'2026-11-10'}}}];
  const pages=buildPageManifest(c);
  assert.equal(pages.find(p=>p.key==='work:sample:en').contentUpdatedAt,'2026-11-10');
  assert.equal(pages.find(p=>p.key==='work:sample:zh').contentUpdatedAt,undefined);
  c.works[0].seo.en.updated_at='2026-02-30';
  assert.equal(buildPageManifest(c).find(p=>p.key==='work:sample:en').contentUpdatedAt,undefined);
});

test('an incomplete candidate can remain unpublished without breaking the catalog', () => {
  const names=['taxonomy.json','works.json','gallery.json','references.json','legacy-locales.json','types.json','collections.json'];
  const data=Object.fromEntries(names.map(name=>[name,JSON.parse(fs.readFileSync(path.join(root,'data',name),'utf8'))]));
  const original=data['gallery.json'][0];
  data['gallery.json'].push({...original,id:'draft-locale-test',slug:'draft-locale-test',demo_url:'https://example.org/draft-locale-test',added_at:null,editorial:{status:'candidate'},locales:{zh:original.locales.zh},ai_provenance:{...original.ai_provenance,description:{zh:'待补充'}},media:{poster:{src:'/media/draft-960.webp',base:'draft',width:1280,height:800}}});
  const result=loadCatalog({readData:name=>structuredClone(data[name])});
  assert.ok(result.works.some(w=>w.id==='draft-locale-test'));
  assert.ok(!result.gallery.some(w=>w.id==='draft-locale-test'));
  assert.ok(!buildPageManifest(result).some(p=>p.entityId==='draft-locale-test'));
});
