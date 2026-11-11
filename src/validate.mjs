import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { safeExternalUrl } from './catalog.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export function loadCatalog() {
  const taxonomy = JSON.parse(fs.readFileSync(path.join(root, 'data/taxonomy.json'), 'utf8'));
  const works = JSON.parse(fs.readFileSync(path.join(root, 'data/works.json'), 'utf8'));
  const ids = new Set();
  const slugs = new Set();
  for (const w of works) {
    const category = taxonomy.categories.find(c => c.id === w.primary_category);
    if (!w.id || ids.has(w.id) || !/^[a-z0-9-]+$/.test(w.slug) || slugs.has(w.slug)) throw new Error(`Invalid or duplicate id/slug: ${w.id}`);
    if (!category || !category.subcategories.some(s => s.id === w.subcategory)) throw new Error(`Invalid category: ${w.id}`);
    if (!w.title_zh || !w.summary_zh || !w.first_action_zh || !safeExternalUrl(w.demo_url)) throw new Error(`Missing work details: ${w.id}`);
    if (!['candidate','needs_review','published','unavailable','rejected'].includes(w.editorial?.status)) throw new Error(`Invalid editorial status: ${w.id}`);
    ids.add(w.id); slugs.add(w.slug);
  }
  return { taxonomy, works };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const { taxonomy, works } = loadCatalog();
  console.log(`Validated ${works.length} works and ${taxonomy.categories.length} categories.`);
}
