// Run manually: node scripts/generate-og.mjs [--output DIRECTORY]
// This reads the same reviewed catalog used by the site. Pillow is needed only
// to regenerate the checked-in images; the site build never runs this script.
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadCatalog, root } from '../src/validate.mjs';

export function buildOgPlan(catalog) {
  const available = catalog.works.filter(work => work.editorial?.status === 'published' && work.media?.poster?.src);
  const byId = new Map(available.map(work => [work.id, work]));
  const preview = work => ({ id: work.id, poster: work.media.poster.src });
  const choose = ids => [...new Set(ids)].map(id => byId.get(id)).filter(Boolean).slice(0, 4).map(preview);
  const homeIds = ['rosette', 'hearthlight', 'hydraulics', 'ocean-currents'];
  const galleryIds = (catalog.gallery || []).map(work => work.id);
  return {
    home: { file: 'home.jpg', works: choose([...homeIds, ...galleryIds, ...available.map(work => work.id)]) },
    fallback: { file: 'fallback.jpg' },
    collections: catalog.collections.map(collection => ({
      id: collection.id,
      file: `collection-${collection.id}.jpg`,
      title: collection.en.title,
      works: choose([...(collection.works.includes(collection.cover) ? [collection.cover] : []), ...collection.works]),
    })),
    works: available.map(work => ({
      id: work.id,
      file: `work-${work.slug}.jpg`,
      title: work.locales.en.title,
      poster: work.media.poster.src,
    })),
  };
}

function main() {
  const args = process.argv.slice(2);
  if (args.length && !(args.length === 2 && args[0] === '--output')) {
    throw new Error('Usage: node scripts/generate-og.mjs [--output DIRECTORY]');
  }
  const output = args.length ? path.resolve(args[1]) : path.join(root, 'assets/og');
  const script = path.join(path.dirname(fileURLToPath(import.meta.url)), 'generate-og.py');
  const input = JSON.stringify({ ...buildOgPlan(loadCatalog()), output });
  const candidates = process.env.FREEMY_PYTHON
    ? [process.env.FREEMY_PYTHON]
    : process.platform === 'win32' ? ['python', 'py'] : ['python3', 'python'];
  for (const executable of candidates) {
    const result = spawnSync(executable, [script], { input, encoding: 'utf8', stdio: ['pipe', 'inherit', 'inherit'] });
    if (result.error?.code === 'ENOENT') continue;
    if (result.error) throw result.error;
    if (result.status !== 0) process.exit(result.status ?? 1);
    return;
  }
  throw new Error('Python with Pillow is required to regenerate share images. Set FREEMY_PYTHON to its executable if needed.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();
