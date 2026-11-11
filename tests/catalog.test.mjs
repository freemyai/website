import test from 'node:test';
import assert from 'node:assert/strict';
import { publishedWorks, filterWorks, safeExternalUrl, escapeHtml, accessLabel, deviceLabel } from '../src/catalog.mjs';

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
