import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog } from '../src/validate.mjs';
import { selectRelatedWorks as select, collectionsForWork as collectionsFor } from '../src/related.mjs';

function work(id, fields = {}) {
  const { editorial, ...otherFields } = fields;
  return { id, editorial: { status: 'published', ...editorial }, ...otherFields };
}

test('related works are ranked by the sum of category, type, collection, and tag weights', () => {
  const origin = work('origin', { primary_category: 'physics', type: 'experiments', tags: ['alpha', 'beta'] });
  const works = [
    work('unrelated'),
    work('one-tag', { tags: ['alpha'] }),
    work('collection-only'),
    work('type-only', { type: 'experiments' }),
    work('category-only', { primary_category: 'physics' }),
    work('type-collection', { type: 'experiments' }),
    work('category-tags', { primary_category: 'physics', tags: ['alpha', 'beta'] }),
    work('category-type', { primary_category: 'physics', type: 'experiments' }),
    work('all', { primary_category: 'physics', type: 'experiments', tags: ['alpha', 'beta'] })
  ];
  const collections = [{ id: 'shared', works: ['origin', 'all', 'type-collection', 'collection-only'] }];

  assert.deepEqual(select(origin, { works, collections }, 20).map(item => item.id), [
    'all', 'category-type', 'category-tags', 'type-collection', 'category-only',
    'type-only', 'collection-only', 'one-tag', 'unrelated'
  ]);
});

test('a category match ties a type match with one shared tag', () => {
  const origin = work('origin', { primary_category: 'physics', type: 'experiments', tags: ['alpha'] });
  const works = [
    work('type-and-tag', { type: 'experiments', tags: ['alpha'], editorial: { featured_order: 10 } }),
    work('category', { primary_category: 'physics', editorial: { featured_order: 0 } })
  ];

  assert.deepEqual(select(origin, { works, collections: [] }, 10).map(item => item.id), ['category', 'type-and-tag']);
});

test('tag overlap counts each tag once and adds at most two points', () => {
  const origin = work('origin', { type: 'experiments', tags: ['alpha', 'beta', 'gamma'] });
  const works = [
    work('duplicate-tag', { tags: ['alpha', 'alpha', 'alpha'], editorial: { featured_order: 0 } }),
    work('three-tags', { tags: ['alpha', 'beta', 'gamma'], editorial: { featured_order: 1 } }),
    work('two-tags', { tags: ['alpha', 'beta'], editorial: { featured_order: 2 } }),
    work('same-type', { type: 'experiments', editorial: { featured_order: 10 } })
  ];

  assert.deepEqual(select(origin, { works, collections: [] }, 10).map(item => item.id), [
    'same-type', 'three-tags', 'two-tags', 'duplicate-tag'
  ]);
});

test('sharing multiple collections contributes the collection bonus only once', () => {
  const origin = work('origin', { primary_category: 'physics' });
  const works = [
    work('shared-twice', { editorial: { featured_order: 0 } }),
    work('category', { primary_category: 'physics', editorial: { featured_order: 2 } })
  ];
  const collections = [
    { id: 'first', works: ['origin', 'shared-twice'] },
    { id: 'second', works: ['origin', 'shared-twice'] }
  ];

  assert.deepEqual(select(origin, { works, collections }, 10).map(item => item.id), ['category', 'shared-twice']);
});

test('only available published works are returned once, never the current work', () => {
  const origin = work('origin');
  const activeA = work('available-a', { editorial: { featured_order: 0 } });
  const activeB = work('available-b', { editorial: { featured_order: 1 }, verification: { availability: 'unknown' } });
  const duplicate = work('duplicate', { editorial: { featured_order: 2 } });
  const works = [
    origin,
    work('origin'),
    work('duplicate', { editorial: { status: 'candidate' } }),
    work('draft', { editorial: { status: 'draft' } }),
    work('needs-review', { editorial: { status: 'needs_review' } }),
    work('rejected', { editorial: { status: 'rejected' } }),
    work('unavailable-status', { editorial: { status: 'unavailable' } }),
    work('unavailable-verification', { verification: { availability: 'unavailable' } }),
    { id: 'missing-status' },
    activeB, duplicate, activeA, duplicate
  ];

  assert.deepEqual(select(origin, { works, collections: [] }, 10), [activeA, activeB, duplicate]);
});

test('ties use ascending featured order then id, independently of input order', () => {
  const origin = work('origin', { primary_category: 'physics' });
  const works = [
    work('unfeatured-z', { primary_category: 'physics' }),
    work('beta', { primary_category: 'physics', editorial: { featured_order: 2.5 } }),
    work('alpha', { primary_category: 'physics', editorial: { featured_order: 2.5 } }),
    work('first', { primary_category: 'physics', editorial: { featured_order: 0 } }),
    work('unfeatured-a', { primary_category: 'physics' }),
    work('second', { primary_category: 'physics', editorial: { featured_order: 1.8 } })
  ];
  const expected = ['first', 'second', 'alpha', 'beta', 'unfeatured-a', 'unfeatured-z'];

  assert.deepEqual(select(origin, { works, collections: [] }, 10).map(item => item.id), expected);
  assert.deepEqual(select(origin, { works: [...works].reverse(), collections: [] }, 10).map(item => item.id), expected);
});

test('missing category, type, and tags are not treated as shared values', () => {
  const origin = work('origin');
  const known = work('known', { primary_category: 'art', type: 'games', editorial: { featured_order: 0 } });
  const missing = work('missing', { editorial: { featured_order: 1 } });
  assert.deepEqual(select(origin, { works: [missing, known], collections: [] }, 10), [known, missing]);

  const oldReference = work('old-reference', { primary_category: 'physics' });
  const knownType = work('known-type', { primary_category: 'physics', type: 'games', editorial: { featured_order: 0 } });
  const missingType = work('missing-type', { primary_category: 'physics', editorial: { featured_order: 1 } });
  assert.deepEqual(select(oldReference, { works: [missingType, knownType], collections: [] }, 10), [knownType, missingType]);
});

test('the default and explicit limits never pad the results', () => {
  const origin = work('origin');
  const works = Array.from({ length: 8 }, (_, index) => work(`item-${index}`));
  const catalog = { works, collections: [] };

  assert.deepEqual(select(origin, catalog).map(item => item.id), ['item-0', 'item-1', 'item-2', 'item-3', 'item-4', 'item-5']);
  assert.deepEqual(select(origin, catalog, 2).map(item => item.id), ['item-0', 'item-1']);
  assert.deepEqual(select(origin, catalog, 20), works);
  assert.deepEqual(select(origin, catalog, 0), []);
  assert.deepEqual(select(origin, catalog, -1), []);
});

test('collection lookup returns the matching collection objects in their original order', () => {
  const collections = [
    { id: 'first', zh: { title: 'First' }, works: ['origin', 'another', 'origin'] },
    { id: 'unrelated', works: ['another'] },
    { id: 'last', en: { title: 'Last' }, works: ['origin'] }
  ];

  assert.deepEqual(collectionsFor('origin', collections), [collections[0], collections[2]]);
  assert.deepEqual(collectionsFor('unknown', collections), []);
});

test('works and collections from loadCatalog can be passed directly to both functions', () => {
  const catalog = loadCatalog();
  const origin = catalog.works.find(item => item.id === 'hydraulics');
  const recommendations = select(origin, catalog);

  assert.equal(recommendations.length, 6);
  assert.ok(recommendations.some(item => item.id === 'wave-tank'));
  assert.equal(new Set(recommendations.map(item => item.id)).size, recommendations.length);
  assert.ok(recommendations.every(item => item.id !== origin.id && catalog.works.includes(item)
    && item.editorial.status === 'published' && item.verification?.availability !== 'unavailable'));
  assert.ok(collectionsFor(origin.id, catalog.collections).some(collection => collection.id === 'motion-lab'));
});
