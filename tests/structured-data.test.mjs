import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog } from '../src/validate.mjs';
import { buildPageManifest } from '../src/page-manifest.mjs';
import { buildStructuredData, breadcrumbsFor, serializeJsonLd } from '../src/structured-data.mjs';

const c=loadCatalog(), pages=buildPageManifest(c), page=key=>pages.find(p=>p.key===key);

test('home names the actual website and original creator remains credited on work pages', () => {
  const home=buildStructuredData(page('home:en'),pages,c).find(x=>x['@type']==='WebSite');
  assert.equal(home.name,'Freemy');assert.equal(home.url,'https://freemy.ai/');
  const work=c.works.find(x=>x.id==='hydraulics');
  const detail=buildStructuredData(page('work:hydraulics:en'),pages,c).find(x=>x['@type']==='WebPage');
  assert.equal(detail.mainEntity.name,work.title_original);
  assert.equal(detail.mainEntity.creator.name,work.creator.name);
  assert.equal(detail.mainEntity.url,work.demo_url);
  assert.equal(detail.mainEntity.offers,undefined);
});

test('structured breadcrumbs match the visible navigation and collection list', () => {
  const p=page('collection:little-games:en'), crumbs=breadcrumbsFor(p,c);
  const nodes=buildStructuredData(p,pages,c);
  const actual=nodes.find(x=>x['@type']==='BreadcrumbList');
  assert.deepEqual(actual.itemListElement.map(x=>x.name),crumbs.map(x=>x.name));
  const list=nodes.find(x=>x['@type']==='CollectionPage').mainEntity;
  const collection=c.collections.find(x=>x.id==='little-games');
  const visible=collection.works.filter(id=>c.works.some(w=>w.id===id&&w.editorial?.status==='published'&&w.verification?.availability!=='unavailable'));
  assert.equal(list.itemListElement.length,visible.length);
});

test('JSON-LD serialization cannot terminate a script element', () => {
  const object={name:'</script><script>alert(1)</script> & text'}, text=serializeJsonLd(object);
  assert.ok(!text.includes('</script>'));
  assert.deepEqual(JSON.parse(text),object);
});
