import test from 'node:test';
import assert from 'node:assert/strict';
import { publishedWorks, filterWorks, safeExternalUrl, escapeHtml, accessLabel, deviceLabel, eligibleForGallery, localizedPath } from '../src/catalog.mjs';
import { loadCatalog } from '../src/validate.mjs';

const works = [
  { id: 'open', editorial: { status: 'published' }, primary_category: 'physics', formats: ['simulation'], access: { login: 'none', language_codes: ['zh-CN'] }, device_support: { mobile: 'tested_supported' } },
  { id: 'unknown', editorial: { status: 'published' }, primary_category: 'physics', formats: ['explainer'], access: { login: 'unknown', language_codes: [] }, device_support: { mobile: 'unknown' } },
  { id: 'candidate', editorial: { status: 'candidate' }, primary_category: 'physics', formats: ['simulation'], access: { login: 'none', language_codes: ['zh-CN'] }, device_support: { mobile: 'tested_supported' } }
];

test('only published entries can reach the public catalogue', () => {
  assert.deepEqual(publishedWorks(works).map(x => x.id), ['open', 'unknown']);
});

test('unknown conditions do not pass positive filters', () => {
  const publicWorks = publishedWorks(works);
  assert.deepEqual(filterWorks(publicWorks, { login: 'none' }).map(x => x.id), ['open']);
  assert.deepEqual(filterWorks(publicWorks, { mobile: 'supported' }).map(x => x.id), ['open']);
  assert.deepEqual(filterWorks(publicWorks, { language: 'zh-CN' }).map(x => x.id), ['open']);
});

test('unsafe links and HTML cannot enter rendered markup', () => {
  assert.equal(safeExternalUrl('javascript:alert(1)'), null);
  assert.equal(safeExternalUrl('https://example.com/work'), 'https://example.com/work');
  assert.equal(escapeHtml('<img onerror="x">'), '&lt;img onerror=&quot;x&quot;&gt;');
});

test('work detail labels reflect known and unknown conditions', () => {
  assert.equal(accessLabel({ login: 'none', pricing: 'free' }), '无需登录 / 免费');
  assert.equal(accessLabel({ login: 'unknown', pricing: 'unknown' }), '未知 / 未知');
  assert.equal(deviceLabel({ desktop: 'tested_supported', mobile: 'unknown' }), '桌面已测试 / 手机未知');
});

test('AI gallery requires a real preview, bilingual descriptions, and evidence of AI creation', () => {
  const work = { editorial:{status:'published'}, media:{poster:{src:'/media/example.jpg'}}, ai_provenance:{status:'author_claimed',usage:'coding',evidence_url:'https://example.com/evidence'}, locales:{zh:{title:'实验',summary:'介绍'},en:{title:'Experiment',summary:'Description'}} };
  assert.equal(eligibleForGallery(work), true);
  assert.equal(eligibleForGallery({...work, ai_provenance:{status:'unknown'}}), false);
  assert.equal(eligibleForGallery({...work, media:{}}), false);
  assert.equal(eligibleForGallery({...work, locales:{zh:work.locales.zh}}), false);
  assert.equal(eligibleForGallery({...work, verification:{availability:'unavailable'}}), false);
});

test('language switch preserves the current work and query', () => {
  assert.equal(localizedPath('/works/hydraulics/', 'en', '?q=gear'), '/en/works/hydraulics/?q=gear');
  assert.equal(localizedPath('/en/works/hydraulics/', 'zh', ''), '/works/hydraulics/');
});

test('English is the default home while Chinese has an explicit home route', () => {
  assert.equal(localizedPath('/', 'en'), '/');
  assert.equal(localizedPath('/', 'zh', '?q=art'), '/zh/?q=art');
  assert.equal(localizedPath('/zh/', 'en', '?q=art'), '/?q=art');
  assert.equal(localizedPath('/en/', 'zh'), '/zh/');
});

test('gallery search understands bilingual topics, subtopics and creation types', () => {
  const {gallery} = loadCatalog();
  for (const term of ['科学与物理', 'Science & Physics', '流体', 'fluids', '互动实验', 'Experiments']) {
    assert.ok(filterWorks(gallery, {q:term}).some(work=>work.id==='hydraulics'), `Missing hydraulics for ${term}`);
  }
});
