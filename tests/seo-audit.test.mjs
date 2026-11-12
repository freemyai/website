import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { auditSite, writeAuditReports } from '../scripts/check-seo.mjs';

const script = fileURLToPath(new URL('../scripts/check-seo.mjs', import.meta.url));
const origin = 'https://freemy.ai';
const pages = [
  {key:'home:en',kind:'home',locale:'en',route:'/',path:'/',indexable:true,includeInSitemap:true},
  {key:'home:zh',kind:'home',locale:'zh',route:'/',path:'/zh/',indexable:true,includeInSitemap:true},
  {key:'work:sample:en',kind:'work',entityId:'sample',locale:'en',route:'/works/sample/',path:'/en/works/sample/',indexable:true,includeInSitemap:true},
  {key:'work:sample:zh',kind:'work',entityId:'sample',locale:'zh',route:'/works/sample/',path:'/works/sample/',indexable:true,includeInSitemap:true},
  {key:'topic:empty:en',kind:'topic',entityId:'empty',locale:'en',route:'/categories/empty/',path:'/en/categories/empty/',indexable:false,includeInSitemap:false},
  {key:'topic:empty:zh',kind:'topic',entityId:'empty',locale:'zh',route:'/categories/empty/',path:'/categories/empty/',indexable:false,includeInSitemap:false}
];
const copy = {
  'home:en':['English home','Discover English home'],
  'home:zh':['中文首页','发现中文首页'],
  'work:sample:en':['English work','Explore this work'],
  'work:sample:zh':['中文作品','浏览这个作品'],
  'topic:empty:en':['Empty category','There are no works yet'],
  'topic:empty:zh':['空分类','这个分类暂无作品']
};

function pageHtml(page) {
  const [title, description] = copy[page.key];
  const siblings = pages.filter(p => p.kind === page.kind && p.entityId === page.entityId);
  const en = siblings.find(p => p.locale === 'en');
  const zh = siblings.find(p => p.locale === 'zh');
  const alternates = page.indexable ? [
    `<link rel="alternate" hreflang="en" href="${origin}${en.path}">`,
    `<link rel="alternate" hreflang="zh-Hans" href="${origin}${zh.path}">`,
    `<link rel="alternate" hreflang="x-default" href="${origin}${en.path}">`
  ].join('') : '<meta name="robots" content="noindex,follow">';
  const jsonld = page.kind === 'topic'
    ? '{"@type":"CollectionPage","mainEntity":{"@type":"ItemList","itemListElement":[]}}'
    : '{"name":"safe \\u003c/script\\u003e"}';
  return `<!doctype html><html lang="${page.locale === 'zh' ? 'zh-CN' : 'en'}"><head>` +
    `<title>${title}</title><meta name="description" content="${description}">` +
    `<link rel="canonical" href="${origin}${page.path}">${alternates}` +
    `<meta property="og:title" content="${title}"><meta property="og:description" content="${description}">` +
    `<meta property="og:url" content="${origin}${page.path}">` +
    `<meta property="og:image" content="${origin}/og/card.jpg">` +
    `<script type="application/ld+json">${jsonld}</script>` +
    `<script src="/_vercel/insights/script.js"></script><script src="/assets/app.mjs?v=1"></script>` +
    `</head><body><img src="/media/poster.webp" srcset="/media/poster-480.webp 480w, /media/poster.webp 960w" alt="Preview">` +
    `<img id="preview-image" alt=""></body></html>`;
}

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'freemy-audit-'));
  t.after(() => fs.rmSync(root, {recursive:true,force:true}));
  const put = (name, data) => {
    const file = path.join(root, name);
    fs.mkdirSync(path.dirname(file), {recursive:true});
    fs.writeFileSync(file, data);
    return file;
  };
  for (const p of pages) put(path.join('dist', p.path.slice(1), 'index.html'), pageHtml(p));
  for (const name of ['dist/media/poster.webp','dist/media/poster-480.webp','dist/og/card.jpg','dist/assets/app.mjs']) put(name, 'fixture');
  put('reports/seo/page-manifest.json', JSON.stringify(pages, null, 2));
  const locations = pages.filter(p => p.includeInSitemap).map(p => `<url><loc>${origin}${p.path}</loc></url>`).join('');
  put('dist/sitemap.xml', `<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${locations}</urlset>`);
  put('dist/robots.txt', `User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`);
  return root;
}

function pageFile(root, urlPath) {
  return path.join(root, 'dist', urlPath.slice(1), 'index.html');
}
function change(root, name, fn) {
  const file = path.join(root, name);
  fs.writeFileSync(file, fn(fs.readFileSync(file, 'utf8')));
}
function changePage(root, urlPath, fn) {
  const file = pageFile(root, urlPath);
  fs.writeFileSync(file, fn(fs.readFileSync(file, 'utf8')));
}
function run(root) {
  const command = spawnSync(process.execPath, [script, '--dir', 'dist'], {cwd:root,encoding:'utf8'});
  const reportFile = path.join(root, 'reports/seo/static-audit.json');
  return {...command, report:fs.existsSync(reportFile) ? JSON.parse(fs.readFileSync(reportFile,'utf8')) : undefined};
}
function hasIssue(result, code) {
  assert.ok(result.report, `No report was written. stderr: ${result.stderr}`);
  assert.ok(result.report.errors.some(issue => issue.code === code), `Expected ${code}; got ${JSON.stringify(result.report.errors)}`);
  assert.notEqual(result.status, 0, 'Audit errors must fail the command');
}

test('a valid bilingual build passes and writes reports outside dist', t => {
  const root = fixture(t);
  const result = run(root);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(result.report.ok, true);
  assert.equal(result.report.pagesChecked, 6);
  assert.deepEqual(result.report.errors, []);
  assert.ok(fs.existsSync(path.join(root, 'reports/seo/summary.md')));
  assert.equal(fs.existsSync(path.join(root, 'dist/reports')), false);
});

test('the exported audit is read-only and rejects reports inside the built site', t => {
  const root = fixture(t);
  const dir = path.join(root, 'dist');
  const report = auditSite({dir, manifestPath:path.join(root, 'reports/seo/page-manifest.json')});
  assert.equal(report.ok, true);
  assert.equal(fs.existsSync(path.join(root, 'reports/seo/static-audit.json')), false);
  assert.throws(() => writeAuditReports(report, {reportDir:path.join(dir, 'reports/seo')}), /outside the built site/);
  assert.equal(fs.existsSync(path.join(dir, 'reports')), false);
});

test('reports cannot enter the built site through a directory link', t => {
  const root = fixture(t);
  const dir = path.join(root, 'dist');
  const target = path.join(dir, 'linked-output');
  const alias = path.join(root, 'report-alias');
  fs.mkdirSync(target);
  fs.symlinkSync(target, alias, process.platform === 'win32' ? 'junction' : 'dir');
  const report = auditSite({dir, manifestPath:path.join(root, 'reports/seo/page-manifest.json')});
  assert.throws(() => writeAuditReports(report, {reportDir:path.join(alias, 'seo')}), /outside the built site/);
  assert.equal(fs.existsSync(path.join(target, 'seo')), false);
});

test('report files cannot point into the built site through a file link', t => {
  const root = fixture(t);
  const dir = path.join(root, 'dist');
  const target = path.join(dir, 'output.json');
  const reportFile = path.join(root, 'reports/seo/static-audit.json');
  fs.writeFileSync(target, 'keep');
  try { fs.symlinkSync(target, reportFile, 'file'); }
  catch (err) {
    if (['EPERM','EACCES','ENOSYS'].includes(err.code)) { t.skip('Creating file links is unavailable'); return; }
    throw err;
  }
  const report = auditSite({dir, manifestPath:path.join(root, 'reports/seo/page-manifest.json')});
  assert.throws(() => writeAuditReports(report, {reportDir:path.dirname(reportFile)}), /outside the built site/);
  assert.equal(fs.readFileSync(target, 'utf8'), 'keep');
});

test('a dangling report file link cannot create a file inside the built site', t => {
  const root = fixture(t);
  const dir = path.join(root, 'dist');
  const target = path.join(dir, 'not-yet-created.json');
  const reportFile = path.join(root, 'reports/seo/static-audit.json');
  try { fs.symlinkSync(target, reportFile, 'file'); }
  catch (err) {
    if (['EPERM','EACCES','ENOSYS'].includes(err.code)) { t.skip('Creating file links is unavailable'); return; }
    throw err;
  }
  const report = auditSite({dir, manifestPath:path.join(root, 'reports/seo/page-manifest.json')});
  assert.throws(() => writeAuditReports(report, {reportDir:path.dirname(reportFile)}), /outside the built site/);
  assert.equal(fs.existsSync(target), false);
});

test('detects a canonical pointing to another page, including the duplicate', t => {
  const root = fixture(t);
  changePage(root, '/zh/', html => html.replace('<link rel="canonical" href="https://freemy.ai/zh/">', '<link rel="canonical" href="https://freemy.ai/">'));
  const result = run(root);
  hasIssue(result, 'canonical-mismatch');
  hasIssue(result, 'canonical-duplicate');
});

test('detects multiple canonical tags on one page', t => {
  const root = fixture(t);
  changePage(root, '/', html => html.replace('</head>', '<link rel="canonical" href="https://freemy.ai/"></head>'));
  hasIssue(run(root), 'canonical-count');
});

test('detects duplicate page titles and descriptions', t => {
  const root = fixture(t);
  changePage(root, '/zh/', html => html.replace('<title>中文首页</title>', '<title>English home</title>').replace('name="description" content="发现中文首页"', 'name="description" content="Discover English home"'));
  const result = run(root);
  hasIssue(result, 'title-duplicate');
  hasIssue(result, 'description-duplicate');
});

test('detects a nonreciprocal language alternate and an incorrect x-default', t => {
  const root = fixture(t);
  changePage(root, '/works/sample/', html => html.replace('hreflang="en" href="https://freemy.ai/en/works/sample/"', 'hreflang="en" href="https://freemy.ai/"').replace('hreflang="x-default" href="https://freemy.ai/en/works/sample/"', 'hreflang="x-default" href="https://freemy.ai/zh/"'));
  hasIssue(run(root), 'hreflang-mismatch');
});

test('rejects a Traditional Chinese page advertised as Simplified Chinese', t => {
  const root = fixture(t);
  changePage(root, '/zh/', html => html.replace('<html lang="zh-CN">', '<html lang="zh-Hant">'));
  hasIssue(run(root), 'html-language');
});

test('detects missing srcset images, local scripts and Open Graph files', t => {
  const root = fixture(t);
  for (const name of ['dist/media/poster-480.webp','dist/assets/app.mjs','dist/og/card.jpg']) fs.unlinkSync(path.join(root, name));
  const result = run(root);
  hasIssue(result, 'asset-missing');
  for (const name of ['/media/poster-480.webp','/assets/app.mjs','/og/card.jpg']) {
    assert.ok(result.report.errors.some(issue => issue.code === 'asset-missing' && issue.message.includes(name)), `Missing diagnostic for ${name}`);
  }
  assert.ok(!result.report.errors.some(issue => issue.message.includes('/_vercel/')));
});

test('requires an absolute, same-site Open Graph image on every page', t => {
  const root = fixture(t);
  changePage(root, '/', html => html.replace('<meta property="og:image" content="https://freemy.ai/og/card.jpg">', ''));
  changePage(root, '/zh/', html => html.replace('content="https://freemy.ai/og/card.jpg"', 'content="https://other.example/card.jpg"'));
  const result = run(root);
  hasIssue(result, 'og-image-missing');
  hasIssue(result, 'og-image-invalid');
});

test('detects stale social metadata that contradicts the page title, description or canonical', t => {
  const root = fixture(t);
  changePage(root, '/', html => html.replace('property="og:title" content="English home"', 'property="og:title" content="Stale title"')
    .replace('property="og:description" content="Discover English home"', 'property="og:description" content="Stale description"')
    .replace('property="og:url" content="https://freemy.ai/"', 'property="og:url" content="https://freemy.ai/zh/"'));
  const result = run(root);
  hasIssue(result, 'og-title-mismatch');
  hasIssue(result, 'og-description-mismatch');
  hasIssue(result, 'og-url-mismatch');
});

test('accepts data URLs and checks local srcset candidates even with comma-separated data', t => {
  const root = fixture(t);
  changePage(root, '/', html => html.replace('</body>', '<img alt="icon" src="data:image/png;base64,abcd" srcset="data:image/png;base64,abcd 1x,/media/poster.webp 2x"></body>'));
  const result = run(root);
  assert.equal(result.status, 0, result.stderr || JSON.stringify(result.report?.errors));
});

test('requires alt on images while allowing decorative empty alt', t => {
  const root = fixture(t);
  changePage(root, '/', html => html.replace(' alt="Preview"', ''));
  hasIssue(run(root), 'image-alt-missing');
});

test('rejects a non-indexable empty category in the sitemap', t => {
  const root = fixture(t);
  change(root, 'dist/sitemap.xml', xml => xml.replace('</urlset>', '<url><loc>https://freemy.ai/categories/empty/</loc></url></urlset>'));
  hasIssue(run(root), 'sitemap-unexpected');
});

test('rejects an empty category even when the manifest and sitemap both wrongly mark it indexable', t => {
  const root = fixture(t);
  const manifestFile = path.join(root, 'reports/seo/page-manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
  for (const page of manifest.filter(item => item.kind === 'topic')) {
    page.indexable = true;
    page.includeInSitemap = true;
    const links = '<link rel="alternate" hreflang="en" href="https://freemy.ai/en/categories/empty/">' +
      '<link rel="alternate" hreflang="zh-Hans" href="https://freemy.ai/categories/empty/">' +
      '<link rel="alternate" hreflang="x-default" href="https://freemy.ai/en/categories/empty/">';
    changePage(root, page.path, html => html.replace('<meta name="robots" content="noindex,follow">', links));
  }
  fs.writeFileSync(manifestFile, JSON.stringify(manifest));
  change(root, 'dist/sitemap.xml', xml => xml.replace('</urlset>', '<url><loc>https://freemy.ai/en/categories/empty/</loc></url><url><loc>https://freemy.ai/categories/empty/</loc></url></urlset>'));
  hasIssue(run(root), 'empty-list-indexable');
});

test('requires noindex on excluded pages and forbids it on indexable pages', t => {
  const root = fixture(t);
  changePage(root, '/categories/empty/', html => html.replace('<meta name="robots" content="noindex,follow">', ''));
  changePage(root, '/', html => html.replace('</head>', '<meta name="robots" content="noindex,follow"></head>'));
  const result = run(root);
  hasIssue(result, 'noindex-missing');
  hasIssue(result, 'noindex-unexpected');
});

test('detects malformed JSON-LD terminated by a malicious closing script tag', t => {
  const root = fixture(t);
  changePage(root, '/', html => html.replace('{"name":"safe \\u003c/script\\u003e"}', '{"name":"x</script><script>globalThis.pwned=true</script>"}'));
  hasIssue(run(root), 'jsonld-invalid');
});

test('detects missing structured data on page types that require it', t => {
  const root = fixture(t);
  changePage(root, '/en/works/sample/', html => html.replace(/<script type="application\/ld\+json">.*?<\/script>/, ''));
  hasIssue(run(root), 'jsonld-missing');
});

test('detects invalid sitemap XML, duplicate locations, and blocking robots rules', t => {
  const root = fixture(t);
  change(root, 'dist/sitemap.xml', xml => xml.replace('</urlset>', '<url><loc>https://freemy.ai/</loc></url></urlset>'));
  change(root, 'dist/robots.txt', robots => robots.replace('Allow: /', 'Disallow: /').replace(`${origin}/sitemap.xml`, 'https://example.com/sitemap.xml'));
  let result = run(root);
  hasIssue(result, 'sitemap-duplicate');
  hasIssue(result, 'robots-blocking');
  hasIssue(result, 'robots-sitemap');
  change(root, 'dist/sitemap.xml', () => '<urlset><url>');
  result = run(root);
  hasIssue(result, 'sitemap-invalid');
});

test('rejects a sitemap with the wrong namespace', t => {
  const root = fixture(t);
  change(root, 'dist/sitemap.xml', xml => xml.replace('http://www.sitemaps.org/schemas/sitemap/0.9', 'https://wrong.example/schema'));
  hasIssue(run(root), 'sitemap-invalid');
});

test('rejects sitemap XML with multiple root elements', t => {
  const root = fixture(t);
  change(root, 'dist/sitemap.xml', xml => `${xml}<extra/>`);
  hasIssue(run(root), 'sitemap-invalid');
});

test('rejects sitemap image entries without a location', t => {
  const root = fixture(t);
  change(root, 'dist/sitemap.xml', xml => xml.replace('</url>', '<image:image xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"/></url>'));
  hasIssue(run(root), 'sitemap-image-invalid');
});

test('a long title is a warning and does not fail the audit', t => {
  const root = fixture(t);
  const long = 'Long '.repeat(20).trim();
  changePage(root, '/', html => html.replace('<title>English home</title>', `<title>${long}</title>`)
    .replace('property="og:title" content="English home"', `property="og:title" content="${long}"`));
  const result = run(root);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.ok(result.report.warnings.some(issue => issue.code === 'title-length'));
});

test('a missing manifest produces a failing report', t => {
  const root = fixture(t);
  fs.unlinkSync(path.join(root, 'reports/seo/page-manifest.json'));
  hasIssue(run(root), 'manifest-invalid');
});
