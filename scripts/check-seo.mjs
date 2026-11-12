import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'parse5';
import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { SITE_ORIGIN } from '../src/site-config.mjs';

const asArray = value => value == null ? [] : Array.isArray(value) ? value : [value];
const normalizedText = value => value.trim().replace(/\s+/gu, ' ').normalize('NFKC').toLowerCase();
const attr = (node, name) => node.attrs?.find(item => item.name === name)?.value;
const hasAttr = (node, name) => node.attrs?.some(item => item.name === name) ?? false;
const hasClass = (node, name) => (attr(node, 'class') || '').split(/\s+/).includes(name);
const tokens = value => (value || '').toLowerCase().split(/[\s,]+/).filter(Boolean);
const relHas = (node, token) => tokens(attr(node, 'rel')).includes(token);
const textOf = node => node.nodeName === '#text' ? node.value : (node.childNodes || []).map(textOf).join('');
const within = (root, target) => {
  const relative = path.relative(root, target);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
};

function resolvedPath(target, visited = new Set()) {
  let current = path.resolve(target);
  const missing = [];
  for (;;) {
    try { return path.resolve(fs.realpathSync(current), ...missing.reverse()); }
    catch (err) {
      if (err.code !== 'ENOENT') throw err;
      try {
        if (fs.lstatSync(current).isSymbolicLink()) {
          if (visited.has(current)) throw new Error('Cyclic report path link');
          visited.add(current);
          const link = fs.readlinkSync(current);
          return resolvedPath(path.resolve(path.dirname(current), link, ...missing.reverse()), visited);
        }
      } catch (linkError) {
        if (linkError.code !== 'ENOENT') throw linkError;
      }
      const parent = path.dirname(current);
      if (parent === current) throw err;
      missing.push(path.basename(current));
      current = parent;
    }
  }
}

function schemaNodes(value) {
  if (Array.isArray(value)) return value.flatMap(schemaNodes);
  if (!value || typeof value !== 'object') return [];
  return [value, ...schemaNodes(value['@graph'])];
}

function nodesUnder(node) {
  return [node, ...(node.childNodes || []).flatMap(nodesUnder)];
}

function hiddenWithin(node, root) {
  for (let current = node; current; current = current.parentNode) {
    if (hasAttr(current, 'hidden')) return true;
    if (current === root) break;
  }
  return false;
}

function normalizedListingUrl(value, base) {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value.trim(), base);
    return ['http:','https:'].includes(url.protocol) ? `${url.origin}${url.pathname}` : null;
  } catch { return null; }
}

// URLs in a srcset can themselves contain commas (for example data: URLs).
function srcsetUrls(value) {
  const urls = [];
  let i = 0;
  while (i < value.length) {
    while (i < value.length && /[\s,]/.test(value[i])) i++;
    const start = i;
    while (i < value.length && !/\s/.test(value[i])) i++;
    let url = value.slice(start, i);
    if (!url) break;
    const endedWithComma = url.endsWith(',');
    url = url.replace(/,+$/, '');
    if (url) urls.push(url);
    if (endedWithComma) continue;
    let parens = 0;
    while (i < value.length) {
      const ch = value[i++];
      if (ch === '(') parens++;
      else if (ch === ')' && parens) parens--;
      else if (ch === ',' && !parens) break;
    }
  }
  return urls;
}

function validManifestPath(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || !value.endsWith('/') || /[?#\\]/.test(value)) return false;
  try {
    const url = new URL(value, SITE_ORIGIN);
    const decoded = decodeURIComponent(url.pathname);
    return url.pathname === value && !decoded.includes('\\') && !decoded.split('/').some(part => part === '.' || part === '..');
  } catch {
    return false;
  }
}

/** Audit a built site without modifying it or making network requests. */
export function auditSite({dir = 'dist', manifestPath = 'reports/seo/page-manifest.json', origin = SITE_ORIGIN} = {}) {
  const outDir = path.resolve(dir);
  const canonicalOrigin = origin.replace(/\/$/, '');
  const result = {ok:false, origin:canonicalOrigin, directory:outDir, pagesExpected:0, pagesChecked:0, errors:[], warnings:[]};
  const seenIssues = new Set();
  const issue = (severity, code, page, message) => {
    const key = JSON.stringify([severity, code, page, message]);
    if (seenIssues.has(key)) return;
    seenIssues.add(key);
    result[severity].push({code, page, message});
  };
  const error = (code, page, message) => issue('errors', code, page, message);
  const warn = (code, page, message) => issue('warnings', code, page, message);
  const finish = () => {
    result.ok = result.errors.length === 0;
    return result;
  };
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    if (!Array.isArray(manifest) || !manifest.length) throw new Error('Expected a non-empty array of page records');
  } catch (err) {
    error('manifest-invalid', String(manifestPath), `Cannot read page manifest: ${err.message}`);
    return finish();
  }

  const pages = [], paths = new Set(), keys = new Set();
  for (const page of manifest) {
    if (!page || typeof page !== 'object' || typeof page.key !== 'string' || !page.key || typeof page.kind !== 'string' || !page.kind ||
        !['en','zh'].includes(page.locale) || !validManifestPath(page.path) || typeof page.indexable !== 'boolean' || typeof page.includeInSitemap !== 'boolean') {
      error('manifest-record-invalid', page?.path || '(unknown)', 'A page record has invalid or missing identity, locale, path or indexing fields');
      continue;
    }
    if (paths.has(page.path)) error('manifest-path-duplicate', page.path, 'Page path occurs more than once in the manifest');
    if (keys.has(page.key)) error('manifest-key-duplicate', page.path, `Page key occurs more than once: ${page.key}`);
    paths.add(page.path);
    keys.add(page.key);
    if (page.includeInSitemap && !page.indexable) error('manifest-sitemap-policy', page.path, 'A non-indexable page is marked for inclusion in the sitemap');
    pages.push(page);
  }
  result.pagesExpected = pages.length;

  const groups = new Map();
  for (const page of pages) {
    const key = JSON.stringify([page.kind, page.entityId ?? null]);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(page);
  }
  const titles = new Map(), descriptions = new Map(), canonicals = new Map(), linksByPage = new Map();
  const builtPages = new Map(pages.map(page => {
    const file = path.resolve(outDir, `.${page.path}`, 'index.html');
    try { return [page.path, within(outDir, file) && fs.statSync(file).isFile()]; }
    catch { return [page.path, false]; }
  }));
  const recordUnique = (map, value, page, code) => {
    if (!value) return;
    const previous = map.get(value);
    if (previous && previous !== page.path) error(code, page.path, `The value is also used by ${previous}`);
    else if (!previous) map.set(value, page.path);
  };
  const readBuiltFile = (urlPath, pagePath, kind) => {
    let decoded;
    try { decoded = decodeURIComponent(urlPath); }
    catch { error('asset-invalid', pagePath, `Invalid escaped ${kind} URL: ${urlPath}`); return; }
    const file = path.resolve(outDir, `.${decoded}`);
    if (!within(outDir, file)) { error('asset-invalid', pagePath, `Unsafe ${kind} path: ${urlPath}`); return; }
    try {
      if (!fs.statSync(file).isFile()) throw new Error('Not a file');
    } catch {
      error('asset-missing', pagePath, `Missing ${kind}: ${urlPath}`);
    }
  };
  const checkResource = (value, pagePath, kind) => {
    if (!value?.trim()) { error('asset-invalid', pagePath, `Empty ${kind} URL`); return; }
    let url;
    try { url = new URL(value.trim(), `${canonicalOrigin}${pagePath}`); }
    catch { error('asset-invalid', pagePath, `Invalid ${kind} URL: ${value}`); return; }
    if (!['http:','https:'].includes(url.protocol) || url.origin !== canonicalOrigin) return;
    if (url.pathname === '/_vercel' || url.pathname.startsWith('/_vercel/')) return;
    readBuiltFile(url.pathname, pagePath, kind);
  };

  for (const page of pages) {
    linksByPage.set(page.path,new Set());
    const file = path.resolve(outDir, `.${page.path}`, 'index.html');
    let html;
    try {
      if (!within(outDir, file)) throw new Error('Path escapes output directory');
      html = fs.readFileSync(file, 'utf8');
    } catch (err) {
      error('page-missing', page.path, `Cannot read built page: ${err.message}`);
      continue;
    }
    result.pagesChecked++;
    const tree = parse(html, {sourceCodeLocationInfo:true});
    const nodes = nodesUnder(tree);
    const head = nodes.find(node => node.tagName === 'head');
    const headNodes = head ? nodesUnder(head) : [];
    const body = nodes.find(node => node.tagName === 'body');
    const bodyNodes = body ? nodesUnder(body) : [];
    const expectedCanonical = `${canonicalOrigin}${page.path}`;
    const baseTag = headNodes.find(node => node.tagName === 'base' && hasAttr(node, 'href'));
    let baseUrl = expectedCanonical;
    try { if (baseTag) baseUrl = new URL(attr(baseTag, 'href'), expectedCanonical).href; }
    catch { /* Browsers use the document URL for an invalid base. */ }
    const htmlNode = nodes.find(node => node.tagName === 'html');
    const lang = (attr(htmlNode || {}, 'lang') || '').toLowerCase();
    let languageMatches = false;
    try {
      const actual = new Intl.Locale(lang);
      languageMatches = page.locale === 'en' ? actual.language === 'en' : actual.language === 'zh' && actual.maximize().script === 'Hans';
    } catch { /* Missing or malformed language tag. */ }
    if (!languageMatches) error('html-language', page.path, `HTML language does not match ${page.locale}: ${lang || '(missing)'}`);

    for (const node of bodyNodes) {
      if (node.tagName !== 'a' || !hasAttr(node, 'href')) continue;
      const href = attr(node, 'href').trim();
      if (href.startsWith('#')) continue;
      let target;
      try { target = new URL(href, baseUrl); }
      catch { continue; }
      if (!['http:','https:'].includes(target.protocol) || target.origin !== canonicalOrigin) continue;
      if (!paths.has(target.pathname) || !builtPages.get(target.pathname)) error('internal-link-missing', page.path, `Internal link ${href || '(empty)'} resolves to a missing page: ${target.pathname}`);
      else linksByPage.get(page.path).add(target.pathname);
    }

    const titleTags = headNodes.filter(node => node.tagName === 'title');
    const title = titleTags.length === 1 ? textOf(titleTags[0]).trim() : '';
    if (titleTags.length !== 1 || !title) error('title-count', page.path, 'Expected exactly one non-empty title in the head');
    else {
      recordUnique(titles, normalizedText(title), page, 'title-duplicate');
      if ([...title].length > 60) warn('title-length', page.path, `Title has ${[...title].length} characters (recommended maximum: 60)`);
    }
    const descriptionTags = headNodes.filter(node => node.tagName === 'meta' && (attr(node, 'name') || '').toLowerCase() === 'description');
    const description = descriptionTags.length === 1 ? (attr(descriptionTags[0], 'content') || '').trim() : '';
    if (descriptionTags.length !== 1 || !description) error('description-count', page.path, 'Expected exactly one non-empty meta description');
    else {
      recordUnique(descriptions, normalizedText(description), page, 'description-duplicate');
      if ([...description].length > 160) warn('description-length', page.path, `Description has ${[...description].length} characters (recommended maximum: 160)`);
    }
    const canonicalTags = headNodes.filter(node => node.tagName === 'link' && relHas(node, 'canonical'));
    if (canonicalTags.length !== 1 || !attr(canonicalTags[0] || {}, 'href')?.trim()) error('canonical-count', page.path, 'Expected exactly one non-empty canonical link');
    for (const tag of canonicalTags) {
      const href = (attr(tag, 'href') || '').trim();
      if (href && href !== expectedCanonical) error('canonical-mismatch', page.path, `Expected ${expectedCanonical}, found ${href}`);
      recordUnique(canonicals, href, page, 'canonical-duplicate');
    }

    const og = name => headNodes.filter(node => node.tagName === 'meta' && (attr(node, 'property') || '').toLowerCase() === name);
    for (const [name, value, code] of [['og:title', title, 'og-title-mismatch'], ['og:description', description, 'og-description-mismatch'], ['og:url', expectedCanonical, 'og-url-mismatch']]) {
      for (const tag of og(name)) if ((attr(tag, 'content') || '').trim() !== value) error(code, page.path, `${name} does not match the page metadata`);
    }
    const ogImages = og('og:image');
    if (!ogImages.length) error('og-image-missing', page.path, 'Expected an Open Graph image');
    for (const tag of ogImages) {
      const value = attr(tag, 'content') || '';
      try {
        if (new URL(value).origin !== canonicalOrigin) throw new Error('Image is outside the site');
      } catch {
        error('og-image-invalid', page.path, `Open Graph image must be an absolute same-site URL: ${value || '(empty)'}`);
      }
    }

    const robotsTags = headNodes.filter(node => node.tagName === 'meta' && (attr(node, 'name') || '').toLowerCase() === 'robots');
    const robotDirectives = robotsTags.flatMap(node => tokens(attr(node, 'content')));
    const crawlerDirectives = headNodes.filter(node => node.tagName === 'meta' && /^(robots|googlebot|bingbot)$/i.test(attr(node, 'name') || '')).flatMap(node => tokens(attr(node, 'content')));
    const isNoindex = directives => directives.includes('noindex') || directives.includes('none');
    if (robotsTags.length > 1) error('robots-meta-duplicate', page.path, 'More than one general robots meta tag');
    if (page.indexable && isNoindex(crawlerDirectives)) error('noindex-unexpected', page.path, 'An indexable page has a noindex directive');
    if (!page.indexable && !isNoindex(robotDirectives)) error('noindex-missing', page.path, 'A non-indexable page must have a general noindex directive');
    if (robotDirectives.includes('index') && isNoindex(robotDirectives)) error('robots-meta-conflict', page.path, 'Robots directives contain both index and noindex');

    const alternates = headNodes.filter(node => node.tagName === 'link' && relHas(node, 'alternate') && hasAttr(node, 'hreflang'));
    if (!page.indexable && alternates.length) error('hreflang-unexpected', page.path, 'Non-indexable pages must not advertise language alternates');
    if (page.indexable) {
      const siblings = groups.get(JSON.stringify([page.kind, page.entityId ?? null])) || [];
      const en = siblings.filter(item => item.locale === 'en' && item.indexable);
      const zh = siblings.filter(item => item.locale === 'zh' && item.indexable);
      if (en.length !== 1 || zh.length !== 1) error('hreflang-pair-missing', page.path, 'Expected one indexable English page and one indexable Chinese page for this content');
      else {
        const expected = new Map([['en', `${canonicalOrigin}${en[0].path}`], ['zh-hans', `${canonicalOrigin}${zh[0].path}`], ['x-default', `${canonicalOrigin}${en[0].path}`]]);
        for (const [language, target] of expected) {
          const matches = alternates.filter(node => (attr(node, 'hreflang') || '').toLowerCase() === language);
          if (matches.length !== 1 || attr(matches[0] || {}, 'href') !== target) error('hreflang-mismatch', page.path, `Expected exactly one ${language} alternate to ${target}`);
        }
        for (const node of alternates) if (!expected.has((attr(node, 'hreflang') || '').toLowerCase())) error('hreflang-unexpected', page.path, `Unexpected alternate language: ${attr(node, 'hreflang') || '(empty)'}`);
      }
    }

    const jsonldScripts = nodes.filter(node => node.tagName === 'script' && (attr(node, 'type') || '').split(';')[0].trim().toLowerCase() === 'application/ld+json');
    if (['home','work','explore','type','collection','topic','collectionIndex'].includes(page.kind) && !jsonldScripts.length) error('jsonld-missing', page.path, 'Expected structured data for this page type');
    const jsonldDocuments = [];
    for (const node of nodes) {
      if (node.tagName === 'img') {
        if (!hasAttr(node, 'alt')) error('image-alt-missing', page.path, `Image lacks an alt attribute: ${attr(node, 'src') || '(no src)'}`);
        if (hasAttr(node, 'src')) checkResource(attr(node, 'src'), page.path, 'image');
      }
      if (['img','source'].includes(node.tagName) && hasAttr(node, 'srcset')) {
        for (const value of srcsetUrls(attr(node, 'srcset'))) checkResource(value, page.path, 'image');
      }
      if (node.tagName === 'video' && hasAttr(node, 'poster')) checkResource(attr(node, 'poster'), page.path, 'image');
      if (node.tagName === 'script' && hasAttr(node, 'src')) checkResource(attr(node, 'src'), page.path, 'script');
      if (node.tagName === 'link' && (relHas(node, 'icon') || relHas(node, 'stylesheet') || relHas(node, 'modulepreload')) && hasAttr(node, 'href')) checkResource(attr(node, 'href'), page.path, 'resource');
      if (node.tagName === 'meta' && ['og:image','og:image:url','og:image:secure_url'].includes((attr(node, 'property') || '').toLowerCase())) checkResource(attr(node, 'content'), page.path, 'Open Graph image');
      if (node.tagName === 'meta' && (attr(node, 'name') || '').toLowerCase() === 'twitter:image') checkResource(attr(node, 'content'), page.path, 'Twitter image');
      if (node.tagName === 'script' && (attr(node, 'type') || '').split(';')[0].trim().toLowerCase() === 'application/ld+json') {
        try {
          if (!node.sourceCodeLocation?.endTag) throw new Error('Missing closing script tag');
          jsonldDocuments.push(JSON.parse(textOf(node)));
        } catch (err) {
          error('jsonld-invalid', page.path, `JSON-LD is invalid or terminated early: ${err.message}`);
        }
      }
    }
    if (['explore','type','topic','collection','collectionIndex'].includes(page.kind)) {
      const main = bodyNodes.find(node => node.tagName === 'main');
      if (!main) error('listing-main-missing', page.path, 'Expected a main content area containing the listing cards');
      const collections = jsonldDocuments.flatMap(schemaNodes).filter(value => asArray(value['@type']).includes('CollectionPage'));
      const lists = collections.flatMap(value => asArray(value.mainEntity)).filter(value => value && typeof value === 'object' && asArray(value['@type']).includes('ItemList') && Array.isArray(value.itemListElement));
      if (jsonldDocuments.length && lists.length !== 1) error('structured-list-invalid', page.path, 'Expected exactly one CollectionPage ItemList of the visible cards');
      if (page.indexable && lists.length && lists.every(value => value.itemListElement.length === 0)) error('empty-list-indexable', page.path, 'An empty listing must not be indexable');
      if (main && lists.length === 1) {
        const cardClass = page.kind === 'collectionIndex' ? 'collection-card' : 'creation-card';
        const cards = nodesUnder(main).filter(node => hasClass(node, cardClass) && !hiddenWithin(node, main));
        const visible = cards.map(card => {
          const cardNodes = nodesUnder(card);
          const heading = cardNodes.find(node => /^h[1-6]$/.test(node.tagName || ''));
          const links = heading ? nodesUnder(heading).filter(node => node.tagName === 'a' && hasAttr(node, 'href')) : [];
          const link = page.kind === 'collectionIndex' && card.tagName === 'a' ? card : links.length === 1 ? links[0] : null;
          const titleNode = page.kind === 'collectionIndex' ? heading : link;
          return {name:titleNode ? textOf(titleNode).trim().replace(/\s+/gu, ' ') : '', url:link ? normalizedListingUrl(attr(link, 'href'), baseUrl) : null};
        });
        const items = lists[0].itemListElement;
        let mismatch = items.length !== visible.length;
        for (let index = 0; index < Math.min(items.length, visible.length); index++) {
          const item = items[index];
          const itemValue = item && typeof item === 'object' ? item.item ?? item.url : null;
          const itemUrl = itemValue && typeof itemValue === 'object' ? itemValue['@id'] ?? itemValue.url : itemValue;
          const name = typeof item?.name === 'string' ? item.name.trim().replace(/\s+/gu, ' ') : '';
          if (!name || !visible[index].name || name !== visible[index].name || !visible[index].url || normalizedListingUrl(itemUrl, baseUrl) !== visible[index].url || Number(item?.position) !== index + 1) mismatch = true;
        }
        if (mismatch) error('structured-list-mismatch', page.path, `ItemList does not match the order, titles or links of the ${visible.length} visible ${cardClass} cards (${items.length} structured entries)`);
      }
    }
  }

  const reachable=new Set(), queue=['/','/zh/'].filter(pathname=>paths.has(pathname));
  for(let i=0;i<queue.length;i++){
    const pathname=queue[i];
    if(reachable.has(pathname))continue;
    reachable.add(pathname);
    for(const target of linksByPage.get(pathname)||[])if(!reachable.has(target))queue.push(target);
  }
  for(const page of pages)if(page.indexable&&!reachable.has(page.path))warn('indexable-unreachable',page.path,'No ordinary internal link path from either home was found');

  const sitemapPath = path.join(outDir, 'sitemap.xml');
  try {
    const xml = fs.readFileSync(sitemapPath, 'utf8');
    if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error('DTD and entity declarations are not supported');
    const validation = XMLValidator.validate(xml);
    if (validation !== true) throw new Error(validation.err.msg);
    const sitemap = new XMLParser({ignoreAttributes:false, parseTagValue:false, trimValues:true}).parse(xml);
    const rootElements = Object.keys(sitemap || {}).filter(key => !key.startsWith('?'));
    if (rootElements.length !== 1 || rootElements[0] !== 'urlset' || Array.isArray(sitemap.urlset) || typeof sitemap.urlset !== 'object' || sitemap.urlset['@_xmlns'] !== 'http://www.sitemaps.org/schemas/sitemap/0.9') throw new Error('Expected one XML urlset with the sitemap namespace');
    const expected = new Set(pages.filter(page => page.indexable && page.includeInSitemap).map(page => `${canonicalOrigin}${page.path}`));
    const actual = new Set();
    for (const entry of asArray(sitemap.urlset.url)) {
      const loc = typeof entry?.loc === 'string' ? entry.loc.trim() : '';
      if (!loc) { error('sitemap-location-invalid', '/sitemap.xml', 'A sitemap entry is missing a location'); continue; }
      if (actual.has(loc)) error('sitemap-duplicate', '/sitemap.xml', `Duplicate sitemap location: ${loc}`);
      actual.add(loc);
      if (!expected.has(loc)) error('sitemap-unexpected', '/sitemap.xml', `Unexpected sitemap location: ${loc}`);
      for (const image of asArray(entry['image:image'])) {
        const imageLocations = asArray(image?.['image:loc']);
        if (imageLocations.length !== 1 || typeof imageLocations[0] !== 'string' || !imageLocations[0].trim()) error('sitemap-image-invalid', '/sitemap.xml', `Image entry for ${loc} must have one location`);
        else checkResource(imageLocations[0], '/sitemap.xml', 'sitemap image');
      }
    }
    for (const loc of expected) if (!actual.has(loc)) error('sitemap-missing', '/sitemap.xml', `Missing sitemap location: ${loc}`);
  } catch (err) {
    error('sitemap-invalid', '/sitemap.xml', `Cannot read or parse sitemap: ${err.message}`);
  }

  try {
    const robots = fs.readFileSync(path.join(outDir, 'robots.txt'), 'utf8');
    const groups = [], sitemapValues = [];
    let group = null, hasRules = false;
    for (const line of robots.split(/\r?\n/)) {
      const match = line.replace(/#.*$/, '').match(/^\s*([^:]+):\s*(.*?)\s*$/);
      if (!match) continue;
      const key = match[1].trim().toLowerCase(), value = match[2].trim();
      if (key === 'user-agent') {
        if (!group || hasRules) { group = {agents:[], allow:[], disallow:[]}; groups.push(group); hasRules = false; }
        group.agents.push(value.toLowerCase());
      } else if (key === 'sitemap') sitemapValues.push(value);
      else if (group && (key === 'allow' || key === 'disallow')) { group[key].push(value); hasRules = true; }
    }
    const wildcard = groups.filter(item => item.agents.includes('*'));
    if (!wildcard.length || !wildcard.some(item => item.allow.includes('/'))) error('robots-allow', '/robots.txt', 'Expected a wildcard user-agent group that allows /');
    if (groups.some(item => item.disallow.some(Boolean))) error('robots-blocking', '/robots.txt', 'Robots rules must not disallow site content');
    if (sitemapValues.length !== 1 || sitemapValues[0] !== `${canonicalOrigin}/sitemap.xml`) error('robots-sitemap', '/robots.txt', `Expected one sitemap directive for ${canonicalOrigin}/sitemap.xml`);
  } catch (err) {
    error('robots-invalid', '/robots.txt', `Cannot read robots.txt: ${err.message}`);
  }
  return finish();
}

/** Write human- and machine-readable audit results outside the published directory. */
export function writeAuditReports(result, {reportDir = 'reports/seo'} = {}) {
  const destination = path.resolve(reportDir);
  const site = resolvedPath(result.directory);
  const outputs = [destination, path.join(destination, 'static-audit.json'), path.join(destination, 'summary.md')];
  if (outputs.some(output => within(site, resolvedPath(output)))) throw new Error('Audit reports must be written outside the built site');
  fs.mkdirSync(destination, {recursive:true});
  fs.writeFileSync(path.join(destination, 'static-audit.json'), `${JSON.stringify(result, null, 2)}\n`);
  const entries = (items, empty) => items.length ? items.map(item => `- **${item.code}** — ${item.page}: ${item.message.replace(/[\r\n]+/g, ' ')}`).join('\n') : empty;
  const summary = `# Freemy static SEO audit\n\n- Result: ${result.ok ? 'PASS' : 'FAIL'}\n- Pages checked: ${result.pagesChecked} / ${result.pagesExpected}\n- Errors: ${result.errors.length}\n- Warnings: ${result.warnings.length}\n\n## Errors\n\n${entries(result.errors, 'None.')}\n\n## Warnings\n\n${entries(result.warnings, 'None.')}\n`;
  fs.writeFileSync(path.join(destination, 'summary.md'), summary);
}

function main(args) {
  let dir = 'dist';
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dir' && args[i + 1] && !args[i + 1].startsWith('--')) dir = args[++i];
    else {
      console.error('Usage: node scripts/check-seo.mjs [--dir dist]');
      return 2;
    }
  }
  try {
    const result = auditSite({dir});
    writeAuditReports(result);
    console.log(`SEO audit ${result.ok ? 'PASS' : 'FAIL'}: ${result.pagesChecked}/${result.pagesExpected} pages, ${result.errors.length} errors, ${result.warnings.length} warnings. Reports: reports/seo/`);
    return result.ok ? 0 : 1;
  } catch (err) {
    console.error(`SEO audit could not write its reports: ${err.message}`);
    return 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = main(process.argv.slice(2));
