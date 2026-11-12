import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import { loadCatalog, root } from '../src/validate.mjs';
import { buildSeo } from '../src/seo.mjs';

function existingWorkImages(catalog) {
  const byName = new Map(catalog.works.filter(work => work.media?.poster?.src)
    .map(work => [`work-${work.slug}.jpg`, work]));
  return fs.readdirSync(path.join(root, 'assets/og'))
    .filter(name => /^work-.*\.jpe?g$/i.test(name))
    .map(name => {
      const work = byName.get(name);
      assert.ok(work, `${name} has no matching catalog work with a poster`);
      return work;
    });
}

test('a newly published work without a dedicated JPEG uses its own poster', () => {
  const catalog = loadCatalog();
  const original = catalog.works.find(work => work.id === 'hydraulics');
  const work = { ...original, id: 'fixture-new-work', slug: 'fixture-new-work' };
  const extended = { ...catalog, works: [...catalog.works, work] };
  assert.ok(!fs.existsSync(path.join(root, 'assets/og/work-fixture-new-work.jpg')));
  assert.ok(!existingWorkImages(extended).some(item => item.id === work.id), 'a missing JPEG must not be required');
  const page = { kind: 'work', entityId: work.id, locale: 'en', path: '/en/works/fixture-new-work/', indexable: true };
  const image = buildSeo(page, [page], extended).og.image;
  assert.deepEqual(image, {
    url: 'https://freemy.ai/media/hydraulics-960.webp',
    alt: 'How Hydraulics Work — creation preview', width: 960, height: 600, type: 'image/webp',
  });
});

// Read the JPEG frame header without requiring an image library during builds/tests.
function jpegDimensions(buffer) {
  assert.equal(buffer.readUInt16BE(0), 0xffd8, 'not a JPEG');
  let offset = 2;
  while (offset < buffer.length) {
    assert.equal(buffer[offset], 0xff, 'invalid JPEG marker');
    while (buffer[offset] === 0xff) offset++;
    const marker = buffer[offset++];
    if (marker === 0xd9 || marker === 0xda) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    const length = buffer.readUInt16BE(offset);
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      return { height: buffer.readUInt16BE(offset + 3), width: buffer.readUInt16BE(offset + 5) };
    }
    assert.ok(length >= 2, 'invalid JPEG segment length');
    offset += length;
  }
  assert.fail('JPEG has no frame header');
}

test('the offline image plan uses each published work’s own reviewed poster', async () => {
  const script = path.join(root, 'scripts/generate-og.mjs');
  assert.ok(fs.existsSync(script), 'offline image generator is missing');
  const { buildOgPlan } = await import('../scripts/generate-og.mjs');
  const catalog = loadCatalog();
  const plan = buildOgPlan(catalog);
  const published = catalog.works.filter(work => work.editorial?.status === 'published');
  const withPosters = published.filter(work => work.media?.poster?.src);
  assert.equal(plan.works.length, withPosters.length);
  for (const work of withPosters) {
    const output = plan.works.find(item => item.id === work.id);
    assert.ok(output, `missing work plan for ${work.id}`);
    assert.equal(output.file, `work-${work.slug}.jpg`);
    assert.equal(output.poster, work.media.poster.src, `wrong poster for ${work.id}`);
  }
  for (const work of published.filter(work => !work.media?.poster?.src)) {
    assert.ok(!plan.works.some(item => item.id === work.id), `unexpected invented preview for ${work.id}`);
  }
  assert.ok(plan.home.works.length >= 3, 'home needs multiple authentic previews');
  const publishedById = new Map(published.map(work => [work.id, work]));
  for (const item of plan.home.works) {
    assert.equal(item.poster, publishedById.get(item.id)?.media?.poster?.src);
  }
  for (const collection of catalog.collections) {
    const output = plan.collections.find(item => item.id === collection.id);
    assert.ok(output, `missing collection plan for ${collection.id}`);
    assert.equal(output.file, `collection-${collection.id}.jpg`);
    assert.ok(output.works.length > 0, `collection ${collection.id} has no previews`);
    for (const item of output.works) {
      assert.ok(collection.works.includes(item.id), `${item.id} is not in ${collection.id}`);
      assert.equal(item.poster, publishedById.get(item.id)?.media?.poster?.src);
    }
  }
});

test('existing share images are compact 1200 × 630 JPEGs with distinct work images', () => {
  const catalog = loadCatalog();
  const works = existingWorkImages(catalog);
  const directory = path.join(root, 'assets/og');
  const names = fs.readdirSync(directory).filter(name => /\.jpe?g$/i.test(name));
  for (const required of ['home.jpg', 'fallback.jpg']) assert.ok(names.includes(required), `missing ${required}`);
  const recognized = new Set(['home.jpg', 'fallback.jpg',
    ...catalog.collections.map(collection => `collection-${collection.id}.jpg`),
    ...works.map(work => `work-${work.slug}.jpg`)]);
  const workHashes = new Set();
  const fallbackHash = createHash('sha256').update(fs.readFileSync(path.join(directory, 'fallback.jpg'))).digest('hex');
  for (const name of names) {
    assert.ok(recognized.has(name), `${name} has no corresponding catalog item`);
    const file = path.join(directory, name);
    const bytes = fs.readFileSync(file);
    assert.deepEqual(jpegDimensions(bytes), { width: 1200, height: 630 }, name);
    assert.ok(bytes.length < 600_000, `${name} is too large for sharing`);
    const hash = createHash('sha256').update(bytes).digest('hex');
    if (name.startsWith('work-')) {
      assert.notEqual(hash, fallbackHash, `${name} is a generic fallback`);
      assert.ok(!workHashes.has(hash), `${name} repeats another work's image`);
      workHashes.add(hash);
    }
  }
});

test('every work image actually shows its own complete preview', t => {
  // Optional only for verification: the build itself uses the checked-in JPEGs
  // and does not require Python or Pillow.
  const candidates = process.env.FREEMY_PYTHON
    ? [process.env.FREEMY_PYTHON]
    : process.platform === 'win32' ? ['python', 'py'] : ['python3', 'python'];
  const python = candidates.find(command => spawnSync(command, ['-c', 'import PIL'], { stdio: 'ignore' }).status === 0);
  if (!python) return t.skip('Pillow is not installed; pixel comparison requires Pillow');
  const works = existingWorkImages(loadCatalog())
    .map(work => ({ id: work.id, slug: work.slug, poster: work.media.poster.src }));
  const check = String.raw`
import json, sys
from pathlib import Path
from PIL import Image, ImageChops, ImageStat
data = json.loads(sys.stdin.buffer.read().decode('utf-8'))
root = Path(data['root'])
for work in data['works']:
    with Image.open(root / 'assets' / work['poster'].lstrip('/')) as source:
        source = source.convert('RGB')
        source.thumbnail((800, 500), Image.Resampling.LANCZOS)
        panel = Image.new('RGB', (800, 500), '#edf1e9')
        panel.paste(source, ((800-source.width)//2, (500-source.height)//2))
        expected = panel.resize((80, 50), Image.Resampling.LANCZOS)
    with Image.open(Path(data['output']) / ('work-' + work['slug'] + '.jpg')) as result:
        actual = result.crop((352, 68, 1152, 568)).convert('RGB').resize((80, 50), Image.Resampling.LANCZOS)
    difference = ImageStat.Stat(ImageChops.difference(actual, expected)).mean
    error = sum(difference) / 3
    if error > 5:
        raise SystemExit(f"{work['id']} does not match its own full preview (mean error {error:.2f})")
`;
  const output = process.env.FREEMY_OG_VERIFY_DIR || path.join(root, 'assets/og');
  const result = spawnSync(python, ['-c', check], { input: JSON.stringify({ root, output, works }), encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test('existing home and collection images show relevant previews, and fallback stays generic', t => {
  const candidates = process.env.FREEMY_PYTHON
    ? [process.env.FREEMY_PYTHON]
    : process.platform === 'win32' ? ['python', 'py'] : ['python3', 'python'];
  const python = candidates.find(command => spawnSync(command, ['-c', 'import PIL'], { stdio: 'ignore' }).status === 0);
  if (!python) return t.skip('Pillow is not installed; pixel comparison requires Pillow');
  const catalog = loadCatalog();
  const available = catalog.works.filter(work => work.editorial?.status === 'published' && work.media?.poster?.src);
  const preview = work => ({ id: work.id, poster: work.media.poster.src });
  const records = [{ file: 'home.jpg', minPreviews: 3, previews: available.map(preview) },
    ...catalog.collections.filter(collection => fs.existsSync(path.join(root, 'assets/og', `collection-${collection.id}.jpg`)))
      .map(collection => ({ file: `collection-${collection.id}.jpg`, minPreviews: 1,
        previews: available.filter(work => collection.works.includes(work.id)).map(preview) }))];
  const check = String.raw`
import json, sys
from pathlib import Path
from PIL import Image, ImageChops, ImageStat
data = json.loads(sys.stdin.buffer.read().decode('utf-8'))
root = Path(data['root'])
cache = {}
def sample(preview, width, height):
    key = (preview['poster'], width, height)
    if key not in cache:
        with Image.open(root / 'assets' / preview['poster'].lstrip('/')) as source:
            source = source.convert('RGB')
            source.thumbnail((width, height), Image.Resampling.LANCZOS)
            panel = Image.new('RGB', (width, height), '#edf1e9')
            panel.paste(source, ((width-source.width)//2, (height-source.height)//2))
            cache[key] = panel.resize((80, 50), Image.Resampling.LANCZOS)
    return cache[key]
def error(left, right):
    return sum(ImageStat.Stat(ImageChops.difference(left, right)).mean) / 3
grid = [(352, 66, 738, 307), (766, 66, 1152, 307),
        (352, 333, 738, 574), (766, 333, 1152, 574)]
layouts = [([(352, 68, 1152, 568)], False),
           ([(352, 191, 738, 433), (766, 191, 1152, 433)], False),
           (grid, False), (grid[:3], True)]
for record in data['records']:
    with Image.open(Path(data['output']) / record['file']) as opened:
        image = opened.convert('RGB')
    matched = False
    for boxes, unused_fourth in layouts:
        if len(boxes) < record['minPreviews']:
            continue
        if unused_fourth and max(ImageStat.Stat(image.crop(grid[3])).var) > 2:
            continue
        used = set()
        for box in boxes:
            actual = image.crop(box).resize((80, 50), Image.Resampling.LANCZOS)
            scores = sorted((error(actual, sample(p, box[2]-box[0], box[3]-box[1])), p['id'])
                            for p in record['previews'] if p['id'] not in used)
            if not scores or scores[0][0] > 5:
                break
            used.add(scores[0][1])
        else:
            matched = True
            break
    if not matched:
        raise SystemExit(record['file'] + ' contains an unrecognized or unrelated preview')
with Image.open(Path(data['output']) / 'fallback.jpg') as opened:
    fallback = opened.convert('RGB')
for boxes, _ in layouts:
    for box in boxes:
        actual = fallback.crop(box).resize((80, 50), Image.Resampling.LANCZOS)
        if any(error(actual, sample(p, box[2]-box[0], box[3]-box[1])) < 5 for p in data['records'][0]['previews']):
            raise SystemExit('The generic fallback contains a work preview')
`;
  const output = process.env.FREEMY_OG_VERIFY_DIR || path.join(root, 'assets/og');
  const result = spawnSync(python, ['-c', check], { input: JSON.stringify({ root, output, records }), encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test('the generator renders Unicode titles identically under non-UTF-8 system locales', t => {
  const candidates = process.env.FREEMY_PYTHON
    ? [process.env.FREEMY_PYTHON]
    : process.platform === 'win32' ? ['python', 'py'] : ['python3', 'python'];
  const python = candidates.find(command => spawnSync(command, ['-c', 'import PIL'], { stdio: 'ignore' }).status === 0);
  if (!python) return t.skip('Pillow is not installed; regeneration requires Pillow');
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'freemy-og-encoding-'));
  const files = ['home.jpg', 'fallback.jpg', 'collection-unicode.jpg'];
  const dirs = ['raw', 'escaped'].map(name => path.join(temp, name));
  try {
    for (const [index, output] of dirs.entries()) {
      const plan = { output, home: { file: 'home.jpg', works: [] }, fallback: { file: 'fallback.jpg' },
        collections: [{ id: 'unicode', file: 'collection-unicode.jpg', title: 'Kansō — Schémas', works: [] }], works: [] };
      let input = JSON.stringify(plan);
      if (index === 1) input = input.replace(/[^\x00-\x7f]/g, char => `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`);
      const result = spawnSync(python, [path.join(root, 'scripts/generate-og.py')],
        { input, encoding: 'utf8', env: { ...process.env, PYTHONIOENCODING: 'gbk' } });
      assert.equal(result.status, 0, result.stderr || result.stdout);
    }
    assert.ok(fs.readFileSync(path.join(dirs[0], 'collection-unicode.jpg')).equals(
      fs.readFileSync(path.join(dirs[1], 'collection-unicode.jpg'))), 'Unicode text changed with the input encoding');
  } finally {
    for (const dir of dirs) {
      for (const file of files) {
        const full = path.join(dir, file);
        if (fs.existsSync(full)) fs.unlinkSync(full);
      }
      if (fs.existsSync(dir)) fs.rmdirSync(dir);
    }
    fs.rmdirSync(temp);
  }
});

test('accented names render readable accents instead of missing-glyph boxes', t => {
  const candidates = process.env.FREEMY_PYTHON
    ? [process.env.FREEMY_PYTHON]
    : process.platform === 'win32' ? ['python', 'py'] : ['python3', 'python'];
  const python = candidates.find(command => spawnSync(command, ['-c', 'import PIL'], { stdio: 'ignore' }).status === 0);
  if (!python) return t.skip('Pillow is not installed; font verification requires Pillow');
  const check = String.raw`
import importlib.util, sys
from PIL import Image, ImageDraw, ImageChops, ImageOps
spec = importlib.util.spec_from_file_location('og', sys.argv[1])
og = importlib.util.module_from_spec(spec)
spec.loader.exec_module(og)
for accented, plain in [('é', 'e'), ('ō', 'o')]:
    base = Image.new('RGB', (150, 150), 'white')
    marked = base.copy()
    og.label(ImageDraw.Draw(base), (30, 30), plain, 60, '#000000')
    og.label(ImageDraw.Draw(marked), (30, 30), accented, 60, '#000000')
    difference = ImageChops.difference(base, marked).getbbox()
    letters = ImageOps.invert(base).getbbox()
    if not difference or difference[3] > letters[1] + 1:
        raise SystemExit('Accent is missing or contains a missing-glyph box')
`;
  const result = spawnSync(python, ['-c', check, path.join(root, 'scripts/generate-og.py')], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
