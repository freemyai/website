import test from 'node:test';
import assert from 'node:assert/strict';
import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { loadCatalog } from '../src/validate.mjs';
import { buildPageManifest } from '../src/page-manifest.mjs';
import { renderSitemap, renderRobots } from '../src/sitemap.mjs';

test('sitemap contains only canonical indexable pages with real images', () => {
  const catalog=loadCatalog(), manifest=buildPageManifest(catalog), xml=renderSitemap(manifest,catalog);
  assert.equal(XMLValidator.validate(xml),true);
  const parsed=new XMLParser({ignoreAttributes:false}).parse(xml), entries=parsed.urlset.url;
  const locs=entries.map(x=>x.loc);
  assert.equal(new Set(locs).size,locs.length);
  assert.ok(locs.includes('https://freemy.ai/'));
  assert.ok(locs.includes('https://freemy.ai/zh/'));
  assert.ok(!locs.includes('https://freemy.ai/en/'));
  assert.ok(!locs.some(x=>x.includes('?')||x.includes('/privacy/')||x.includes('/submit/')||x.includes('/404/')));
  assert.deepEqual(new Set(locs),new Set(manifest.filter(p=>p.includeInSitemap).map(p=>`https://freemy.ai${p.path}`)));
  const hydraulic=entries.find(x=>x.loc==='https://freemy.ai/en/works/hydraulics/');
  assert.equal(hydraulic['image:image']['image:loc'],'https://freemy.ai/media/hydraulics-960.webp');
  assert.equal(hydraulic.lastmod,undefined);
});

test('robots allows content and points to the canonical sitemap', () => {
  const robots=renderRobots();
  assert.match(robots,/User-agent: \*/);
  assert.match(robots,/Allow: \//);
  assert.match(robots,/Sitemap: https:\/\/freemy\.ai\/sitemap\.xml/);
  assert.doesNotMatch(robots,/Disallow:/);
});
