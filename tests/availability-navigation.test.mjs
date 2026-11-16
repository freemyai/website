import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog } from '../src/validate.mjs';
import { buildPageManifest } from '../src/page-manifest.mjs';
import { buildSeo } from '../src/seo.mjs';
import { home, explore } from '../src/pages.mjs';

function surpriseLink(html) {
  const link = html.match(/<a class="surprise" data-surprise[^>]*href="([^"]+)"[^>]*>/);
  assert.ok(link, 'random discovery link should be present');
  return link[1];
}

test('home random discovery does not link to a work removed for unavailability', () => {
  const catalog = loadCatalog();
  const removed = catalog.works.find(work => work.id === 'hydraulics');
  removed.editorial = { ...removed.editorial, status: 'unavailable' };
  catalog.gallery = catalog.gallery.filter(work => work.id !== removed.id);
  const manifest = buildPageManifest(catalog), page = manifest.find(item => item.key === 'home:en');
  const html = home('en', catalog, buildSeo(page, manifest, catalog));
  const href = surpriseLink(html);
  assert.equal(manifest.some(item => item.kind === 'work' && item.entityId === removed.id), false);
  assert.doesNotMatch(html, /href="\/en\/works\/hydraulics\/"/);
  assert.notEqual(href, '/en/works/hydraulics/');
  assert.ok(manifest.some(item => item.kind === 'work' && item.path === href), `random discovery points to a missing work: ${href}`);
});

test('an empty type keeps random discovery on an existing page', () => {
  const catalog = loadCatalog();
  for (const work of catalog.works) {
    if (work.type === 'games' || work.id === 'hydraulics') work.editorial = { ...work.editorial, status: 'unavailable' };
  }
  catalog.gallery = catalog.gallery.filter(work => work.editorial.status === 'published');
  const manifest = buildPageManifest(catalog), page = manifest.find(item => item.key === 'type:games:en');
  const type = catalog.types.find(item => item.id === 'games');
  const html = explore('en', catalog, type, buildSeo(page, manifest, catalog), page);
  const href = surpriseLink(html);
  assert.equal(href, page.path);
  assert.match(html, /data-surprise[^>]*aria-disabled="true"/);
});
