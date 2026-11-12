import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = name => JSON.parse(fs.readFileSync(new URL(`../data/${name}.json`, import.meta.url), 'utf8'));
const types = read('types');
const collections = read('collections');
const locales = ['zh', 'en'];
const typeIds = ['games', 'experiments', 'learning', 'art', 'apps', 'worlds'];
const originalMembers = {
  'little-games': ['tree-appreciator', 'labyrinthos', 'hyperbrick', 'hearthlight', 'star-hop', 'battle-drones', 'knockbots', 'lili-last-door', 'afterlight', 'felt-world', 'null-range'],
  'sound-lab': ['type-sound', 'mpump', 'web-bayan', 'soft-machine', 'pulse', 'luminote', 'stave'],
  'machines-in-motion': ['v8-engine', 'form-01', 'drone-lab', 'learn-arduino', 'hydraulics', 'terrain-rover', 'robolabs', 'roadster-explorer', 'wind-tide', 'spacex-vehicles', 'bee-x9']
};

function nonempty(value, label) {
  assert.equal(typeof value, 'string', `${label} must be text`);
  assert.ok(value.trim(), `${label} must not be empty`);
}

function metadata(entry, label) {
  for (const lang of locales) {
    nonempty(entry.seo?.[lang]?.title, `${label} ${lang} title`);
    nonempty(entry.seo?.[lang]?.description, `${label} ${lang} description`);
    assert.equal((entry.seo[lang].title.match(/Freemy/g) || []).length, 1, `${label} ${lang} title must include the brand once`);
  }
}

test('each creation type has its own bilingual introduction and complete search metadata', () => {
  for (const id of typeIds) {
    const type = types.find(item => item.id === id);
    assert.ok(type, `missing type ${id}`);
    metadata(type, id);
    for (const lang of locales) nonempty(type.intro?.[lang], `${id} ${lang} introduction`);
  }
  for (const lang of locales) {
    for (const select of [type => type.intro[lang], type => type.seo[lang].title, type => type.seo[lang].description]) {
      assert.equal(new Set(typeIds.map(id => select(types.find(item => item.id === id)))).size, typeIds.length, `${lang} type content must be distinct`);
    }
  }
});

test('featured collections have bilingual guidance for every included work and valid related collections', () => {
  const collectionIds = new Set(collections.map(item => item.id));
  for (const [id, original] of Object.entries(originalMembers)) {
    const collection = collections.find(item => item.id === id);
    assert.ok(collection, `missing collection ${id}`);
    metadata(collection, id);
    assert.deepEqual(collection.works.filter(workId => original.includes(workId)), original, `${id} must preserve existing works and their order`);
    assert.ok(Array.isArray(collection.related_collections) && collection.related_collections.length, `${id} needs related collections`);
    assert.equal(new Set(collection.related_collections).size, collection.related_collections.length, `${id} has repeated related collections`);
    for (const related of collection.related_collections) {
      assert.ok(collectionIds.has(related) && related !== id, `${id} has an invalid related collection: ${related}`);
    }
    for (const lang of locales) {
      const text = collection[lang];
      for (const key of ['intro', 'selection_notes']) {
        assert.ok(Array.isArray(text?.[key]) && text[key].length, `${id} ${lang} needs ${key}`);
        text[key].forEach((paragraph, index) => nonempty(paragraph, `${id} ${lang} ${key}[${index}]`));
      }
      assert.deepEqual(Object.keys(text.work_notes || {}).sort(), [...collection.works].sort(), `${id} ${lang} work notes must match the actual members`);
      for (const workId of collection.works) nonempty(text.work_notes[workId], `${id} ${lang} note for ${workId}`);
    }
  }
});
