import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog } from '../src/validate.mjs';
import { buildPageManifest } from '../src/page-manifest.mjs';
import { buildSeo, renderSeoHead } from '../src/seo.mjs';
import { siteUrl } from '../src/site-config.mjs';

const c=loadCatalog(), pages=buildPageManifest(c), page=key=>pages.find(p=>p.key===key);

test('home metadata uses distinct English and Chinese canonical pages', () => {
  const en=buildSeo(page('home:en'),pages,c), zh=buildSeo(page('home:zh'),pages,c);
  assert.equal(en.title,'Freemy — AI Games, Interactive Experiments & Creative Apps');
  assert.equal(zh.title,'Freemy｜AI 创意作品、互动实验与网页游戏');
  assert.equal(en.canonical,'https://freemy.ai/');
  assert.equal(zh.canonical,'https://freemy.ai/zh/');
  assert.equal(en.alternates.en,'https://freemy.ai/');
  assert.equal(en.alternates['zh-Hans'],'https://freemy.ai/zh/');
  assert.equal(en.alternates['x-default'],'https://freemy.ai/');
});

test('work metadata stays on the matching content and does not duplicate the brand', () => {
  const en=buildSeo(page('work:hydraulics:en'),pages,c), zh=buildSeo(page('work:hydraulics:zh'),pages,c);
  assert.equal(en.canonical,'https://freemy.ai/en/works/hydraulics/');
  assert.equal(zh.canonical,'https://freemy.ai/works/hydraulics/');
  assert.equal(zh.alternates.en,en.canonical);
  assert.equal(en.alternates['zh-Hans'],zh.canonical);
  assert.equal((en.title.match(/Freemy/gi)||[]).length,1);
  assert.ok(en.description.length>0);
});

test('non-indexable pages expose noindex without misleading language alternates', () => {
  const meta=buildSeo(page('privacy:en'),pages,c);
  assert.equal(meta.robots,'noindex,follow');
  assert.deepEqual(meta.alternates,{});
  assert.match(renderSeoHead(meta),/name="robots" content="noindex,follow"/);
});

test('metadata escapes page content in HTML and uses absolute same-site canonical URLs', () => {
  const meta={...buildSeo(page('home:en'),pages,c),title:'A "quote" & a title'};
  const html=renderSeoHead(meta);
  assert.match(html,/<title>A &quot;quote&quot; &amp; a title<\/title>/);
  assert.equal((html.match(/rel="canonical"/g)||[]).length,1);
  assert.match(html,/href="https:\/\/freemy\.ai\/"/);
});

test('a brand fallback is not described as a screenshot of a work without a preview', () => {
  const meta=buildSeo(page('work:wedulab-voltlab:en'),pages,c);
  assert.match(meta.og.image.url,/\/og\/fallback\.jpg$/);
  assert.match(meta.og.image.alt,/Freemy/);
  assert.doesNotMatch(meta.og.image.alt,/creation preview/i);
});

test('canonical URLs cannot be constructed from external, parameterized or traversing paths', () => {
  for(const path of ['//example.com/','/works/a/?q=1','/works/../other/','/works/%2e%2e/other/']) {
    assert.throws(()=>siteUrl(path),/Invalid canonical path/);
  }
});
