import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { localizedPath } from '../src/catalog.mjs';

test('locale routes preserve the existing asymmetric URL scheme', () => {
  const cases = [
    ['/', 'en', '/'], ['/', 'zh', '/zh/'], ['/en/', 'en', '/'], ['/en', 'zh', '/zh/'],
    ['/zh/', 'en', '/'], ['/works/hydraulics/', 'en', '/en/works/hydraulics/'],
    ['/en/works/hydraulics/', 'zh', '/works/hydraulics/'],
    ['/explore/', 'en', '/en/explore/'], ['/en/types/games/', 'zh', '/types/games/'],
    ['/collections/little-games/', 'en', '/en/collections/little-games/'],
    ['/en/categories/physics/', 'zh', '/categories/physics/']
  ];
  for (const [path, locale, expected] of cases) assert.equal(localizedPath(path, locale), expected);
});

test('locale switches normalize trailing slashes and preserve queries and fragments', () => {
  assert.equal(localizedPath('/en/works/hydraulics?q=gear#details', 'zh'), '/works/hydraulics/?q=gear#details');
  assert.equal(localizedPath('/en?sort=recent#top', 'zh'), '/zh/?sort=recent#top');
  assert.equal(localizedPath('/collections/sound-lab/', 'en', '?q=music#list'), '/en/collections/sound-lab/?q=music#list');
});

test('hosting configuration redirects only the English home alias', () => {
  const config = JSON.parse(fs.readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
  assert.equal(config.trailingSlash, true);
  const redirects = config.redirects || [];
  assert.ok(redirects.some(r => r.source === '/en' && r.destination === '/' && r.permanent));
  assert.ok(redirects.some(r => r.source === '/en/' && r.destination === '/' && r.permanent));
  assert.ok(redirects.every(r => !r.source.includes(':path')));
  const headers=config.headers.flatMap(rule=>rule.headers||[]);
  assert.ok(headers.some(h=>h.key.toLowerCase()==='referrer-policy'&&h.value==='strict-origin'));
});
