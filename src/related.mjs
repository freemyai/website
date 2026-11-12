export function collectionsForWork(workId, collections = []) {
  return collections.filter(collection => collection.works?.includes(workId));
}

export function selectRelatedWorks(work, catalog, limit = 6) {
  const ownCollections = collectionsForWork(work.id, catalog.collections);
  const ownTags = new Set(work.tags || []);
  const candidates = catalog.works
    .filter(candidate => candidate.id && candidate.id !== work.id
      && candidate.editorial?.status === 'published'
      && candidate.verification?.availability !== 'unavailable')
    .map(candidate => {
      let score = 0;
      if (work.primary_category && work.primary_category === candidate.primary_category) score += 4;
      if (work.type && work.type === candidate.type) score += 3;
      if (ownCollections.some(collection => collection.works.includes(candidate.id))) score += 2;
      const sharedTags = [...new Set(candidate.tags || [])].filter(tag => ownTags.has(tag)).length;
      score += Math.min(sharedTags, 2);
      return { work: candidate, score, order: candidate.editorial.featured_order ?? Infinity };
    });

  candidates.sort((a, b) => b.score - a.score || a.order - b.order
    || (a.work.id < b.work.id ? -1 : a.work.id > b.work.id ? 1 : 0));

  const seen = new Set();
  return candidates
    .filter(candidate => {
      if (seen.has(candidate.work.id)) return false;
      seen.add(candidate.work.id);
      return true;
    })
    .slice(0, Math.max(0, Math.floor(limit)))
    .map(candidate => candidate.work);
}
