import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog } from '../src/validate.mjs';
import { buildPageManifest } from '../src/page-manifest.mjs';
import { buildSeo } from '../src/seo.mjs';
import { detail, collectionPage } from '../src/pages.mjs';
import { image } from '../src/components.mjs';

test('unavailable works keep their detail page without an active original-site button', () => {
  const c=loadCatalog(), index=c.works.findIndex(w=>w.id==='hydraulics');
  c.works[index]={...c.works[index],verification:{...c.works[index].verification,availability:'unavailable'}};
  const manifest=buildPageManifest(c), page=manifest.find(p=>p.key==='work:hydraulics:en');
  const html=detail('en',c,c.works[index],buildSeo(page,manifest,c),page);
  assert.match(html,/temporarily unavailable/i);
  assert.doesNotMatch(html,/class="button button-dark detail-open"/);
  assert.match(html,/class="wrap related-section"/);
  assert.match(html,/href="\/en\/categories\/physics\/"/);
});

test('detail images use a layout-appropriate sizes hint and lazy related images', () => {
  const c=loadCatalog(), work=c.works.find(w=>w.id==='hydraulics');
  const detailImage=image(work,'en',{context:'detail',priority:'lcp'});
  assert.match(detailImage,/760px/);
  assert.match(detailImage,/fetchpriority="high"/);
  assert.match(image(work,'en',{context:'related'}),/loading="lazy"/);
});

test('published preview images have bilingual descriptions and render them in the matching language', () => {
  const catalog=loadCatalog();
  for (const work of catalog.works.filter(item=>item.media?.poster)) {
    for (const lang of ['zh','en']) {
      const alt=work.media?.poster?.alt?.[lang];
      assert.ok(typeof alt==='string'&&alt.trim().length>0,`${work.id}: missing ${lang} image description`);
    }
  }
  const hydraulic=catalog.gallery.find(work=>work.id==='hydraulics');
  assert.match(image(hydraulic,'en'),/A diagram of a hydraulic excavator and pistons/);
  assert.match(image(hydraulic,'zh'),/液压挖掘机与活塞示意图/);
});

test('featured collection guidance follows the real gallery in the HTML', () => {
  const c=loadCatalog(), manifest=buildPageManifest(c), page=manifest.find(p=>p.key==='collection:machines-in-motion:en');
  const html=collectionPage('en',c,c.collections.find(x=>x.id===page.entityId),buildSeo(page,manifest,c),page);
  assert.ok(html.indexOf('class="gallery-grid"')<html.indexOf('class="wrap collection-notes"'));
  assert.match(html,/href="\/en\/works\/v8-engine\/"/);
  assert.match(html,/Related collections/);
});
