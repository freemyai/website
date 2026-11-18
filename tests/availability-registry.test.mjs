import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadCatalog } from '../src/validate.mjs';

function checkAvailabilityRegistry(registry, catalog) {
  const seen = new Set();
  assert.equal(registry.schema_version, 1);
  assert.ok(Array.isArray(registry.entries));
  for (const entry of registry.entries) {
    const work = catalog.works.find(item => item.id === entry.work_id);
    assert.ok(work, `unknown work: ${entry.work_id}`);
    assert.ok(!seen.has(entry.work_id), `duplicate work: ${entry.work_id}`);
    seen.add(entry.work_id);
    assert.match(entry.original_url, /^https?:\/\//);
    assert.equal(entry.previous_editorial_status, 'published');
    assert.ok(['pending_verification', 'unavailable', 'recovered_pending_review'].includes(entry.status));
    const first = Date.parse(entry.first_detected_at), last = Date.parse(entry.last_checked_at);
    assert.ok(Number.isFinite(first) && Number.isFinite(last) && last >= first, `${entry.work_id}: invalid check times`);
    assert.ok(typeof entry.reason === 'string' && entry.reason.trim());
    assert.ok(Array.isArray(entry.evidence) && entry.evidence.length > 0);
    for (const check of entry.evidence) {
      const checked = Date.parse(check.checked_at);
      assert.ok(Number.isFinite(checked) && checked <= last, `${entry.work_id}: invalid evidence time`);
      assert.ok(typeof check.method === 'string' && check.method.trim());
      assert.ok(typeof check.observation === 'string' && check.observation.trim());
    }
    if (['unavailable', 'recovered_pending_review'].includes(entry.status)) {
      const removed = work.editorial.status === 'unavailable';
      const temporarilyUnavailable = work.editorial.status === 'published' && work.verification?.availability === 'unavailable';
      assert.ok(removed || temporarilyUnavailable, `${entry.work_id}: unavailable work was republished`);
      assert.ok(!catalog.gallery.some(item => item.id === work.id), `${entry.work_id}: unavailable work remains in the gallery`);
    }
  }
  for (const work of catalog.works.filter(item => item.editorial?.status === 'unavailable' || (item.editorial?.status === 'published' && item.verification?.availability === 'unavailable'))) {
    assert.ok(seen.has(work.id), `${work.id}: removed work has no availability record`);
  }
}

test('availability records retain evidence and agree with removed works', () => {
  const registry = JSON.parse(fs.readFileSync(new URL('../data/availability-exceptions.json', import.meta.url), 'utf8'));
  checkAvailabilityRegistry(registry, loadCatalog());
});

test('temporary unavailability retains the work but removes it from discovery', () => {
  const work={id:'sample',editorial:{status:'published'},verification:{availability:'unavailable'}};
  const entry={work_id:'sample',original_url:'https://example.org/',previous_editorial_status:'published',status:'unavailable',first_detected_at:'2026-11-18T00:00:00Z',last_checked_at:'2026-11-18T00:00:00Z',reason:'Confirmed unavailable',evidence:[{checked_at:'2026-11-18T00:00:00Z',method:'browser',observation:'Confirmed unavailable'}]};
  const registry={schema_version:1,entries:[entry]}, catalog={works:[work],gallery:[]};
  assert.doesNotThrow(()=>checkAvailabilityRegistry(registry,catalog));
  assert.throws(()=>checkAvailabilityRegistry(registry,{...catalog,gallery:[work]}),/remains in the gallery/);
  assert.throws(()=>checkAvailabilityRegistry(registry,{...catalog,works:[{...work,verification:{availability:'available'}}]}),/republished/);
  assert.throws(()=>checkAvailabilityRegistry({...registry,entries:[]},catalog),/no availability record/);
});
