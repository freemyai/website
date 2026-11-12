import { urlFor } from './i18n.mjs';

const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '') ? value : undefined;
const available = work => work.editorial?.status === 'published' && work.verification?.availability !== 'unavailable';

export function buildPageManifest(catalog) {
  const pages = [], seenPaths = new Set(), seenKeys = new Set();
  const published = catalog.works.filter(work => work.editorial?.status === 'published');
  for (const work of published) for (const locale of ['zh','en']) {
    for (const field of ['title','summary','action','why','limit']) {
      if (typeof work.locales?.[locale]?.[field] !== 'string' || !work.locales[locale][field].trim()) {
        throw new Error(`Missing published translation ${locale}.${field}: ${work.id}`);
      }
    }
  }
  const add = (kind, locale, route, { entityId, indexable = true, contentUpdatedAt } = {}) => {
    const key = [kind, entityId, locale].filter(Boolean).join(':');
    const path = urlFor(locale, route);
    if (seenPaths.has(path) || seenKeys.has(key)) throw new Error(`Duplicate page path or key: ${path} (${key})`);
    seenPaths.add(path); seenKeys.add(key);
    const page = {key, kind, locale, route, path, indexable, includeInSitemap:indexable};
    if (entityId) page.entityId = entityId;
    const date = validDate(contentUpdatedAt);
    if (date) page.contentUpdatedAt = date;
    pages.push(page);
  };
  for (const locale of ['zh','en']) {
    add('home',locale,'/');
    add('explore',locale,'/explore/',{indexable:catalog.gallery.length > 0});
    add('collectionIndex',locale,'/collections/',{indexable:catalog.collections.some(c=>c.works.some(id=>catalog.works.some(w=>w.id===id&&available(w))))});
    add('about',locale,'/about/');
    add('privacy',locale,'/privacy/',{indexable:false});
    add('submit',locale,'/submit/',{indexable:false});
    for (const type of catalog.types) add('type',locale,`/types/${type.id}/`,{entityId:type.id,indexable:catalog.gallery.some(w=>w.type===type.id),contentUpdatedAt:type.seo?.[locale]?.updated_at});
    for (const collection of catalog.collections) add('collection',locale,`/collections/${collection.id}/`,{entityId:collection.id,indexable:collection.works.some(id=>catalog.works.some(w=>w.id===id&&available(w))),contentUpdatedAt:collection.seo?.[locale]?.updated_at});
    for (const work of published) add('work',locale,`/works/${work.slug}/`,{entityId:work.id,contentUpdatedAt:work.seo?.[locale]?.updated_at});
    for (const topic of catalog.taxonomy.categories) add('topic',locale,`/categories/${topic.id}/`,{entityId:topic.id,indexable:catalog.works.some(w=>w.primary_category===topic.id&&available(w)),contentUpdatedAt:topic.seo?.[locale]?.updated_at});
    add('notFound',locale,'/404/',{indexable:false});
  }
  return pages;
}
