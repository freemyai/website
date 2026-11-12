import dns from 'node:dns';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import https from 'node:https';
import net from 'node:net';
import path from 'node:path';
import { Readable } from 'node:stream';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parse as parseHtml } from 'parse5';
import { XMLParser, XMLValidator } from 'fast-xml-parser';

const PRODUCTION = 'https://freemy.ai';
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const DEFAULT_TIMEOUT_MS = 10_000;
const MAX_BODY_BYTES = 1_000_000;
const MAX_REDIRECTS = 5;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MISSING_PATH = '/__freemy-seo-audit-page-that-does-not-exist__/';

function checkedUrl(value) {
  let url;
  try { url = new URL(value); } catch { throw new Error('Invalid URL'); }
  const host = url.hostname.toLowerCase();
  const preview = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.vercel\.app$/.test(host);
  if (url.protocol !== 'https:' || url.username || url.password || url.port ||
      !(host === 'freemy.ai' || host === 'www.freemy.ai' || preview)) {
    throw new Error(`Unsafe or unsupported URL: ${url.origin}`);
  }
  return url;
}

function checkedBase(value) {
  const url = checkedUrl(value);
  if (url.pathname !== '/' || url.search || url.hash) throw new Error('The base must be an HTTPS origin without a path, query, or fragment');
  return url;
}

function sameDeployment(url, base) {
  if (base.hostname.endsWith('.vercel.app')) return url.origin === base.origin;
  return url.hostname === 'freemy.ai' || url.hostname === 'www.freemy.ai';
}

function publicAddress(address) {
  const family = net.isIP(address);
  if (family === 4) {
    const [a, b, c] = address.split('.').map(Number);
    return !(a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) ||
      (a === 192 && b === 0 && (c === 0 || c === 2)) ||
      (a === 192 && b === 88 && c === 99) ||
      (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
      (a === 203 && b === 0 && c === 113));
  }
  if (family !== 6) return false;
  // Only ordinary globally routable IPv6 addresses. This also excludes mapped
  // IPv4, local, multicast, NAT64 and other transition ranges.
  const first = parseInt(address.split(':')[0] || '0', 16);
  if (first < 0x2000 || first > 0x3fff || first === 0x2002) return false;
  const second = parseInt(address.split(':')[1] || '0', 16);
  return !(first === 0x2001 && (second < 0x200 || second === 0xdb8)) &&
    first !== 0x3ffe && !(first === 0x3fff && second < 0x1000);
}

// Injecting lookup makes the same address checks testable without network access.
export function createSafeLookup(lookup = dns.lookup) {
  return (hostname, options, callback) => {
    lookup(hostname, { all: true, verbatim: true }, (error, records) => {
      if (error) return callback(error);
      if (!Array.isArray(records) || !records.length || records.some(record => !publicAddress(record.address))) {
        return callback(new Error('DNS returned a non-public or invalid address'));
      }
      const requestedFamily = typeof options === 'object' ? options.family : 0;
      const eligible = requestedFamily ? records.filter(record => record.family === requestedFamily) : records;
      if (!eligible.length) return callback(new Error('DNS returned no address for the requested family'));
      if (typeof options === 'object' && options.all) return callback(null, eligible);
      return callback(null, eligible[0].address, eligible[0].family);
    });
  };
}

// A per-request lookup prevents a second, unchecked DNS resolution at connect
// time; TLS still verifies the original hostname. No proxies are used.
function secureFetch(url, { signal, headers }) {
  return new Promise((resolve, reject) => {
    const request = https.request(url, { method: 'GET', signal, headers, lookup: createSafeLookup(), agent: false }, response => {
      const responseHeaders = new Headers();
      for (const [name, value] of Object.entries(response.headers)) {
        if (Array.isArray(value)) value.forEach(item => responseHeaders.append(name, item));
        else if (value !== undefined) responseHeaders.set(name, value);
      }
      const status = response.statusCode || 500;
      const body = [204, 205, 304].includes(status) ? null : Readable.toWeb(response);
      if (!body) response.resume();
      resolve(new Response(body, { status, headers: responseHeaders }));
    });
    request.on('error', reject);
    request.end();
  });
}

class BudgetExhausted extends Error {}
class AccessProtected extends Error {}

async function readText(response) {
  const length = Number(response.headers.get('content-length'));
  if (Number.isFinite(length) && length > MAX_BODY_BYTES) throw new Error('Response exceeds the text size limit');
  if (!response.body) return '';
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) throw new Error('Response exceeds the text size limit');
      chunks.push(value);
    }
    return new TextDecoder().decode(Buffer.concat(chunks.map(value => Buffer.from(value))));
  } catch (error) {
    await reader.cancel().catch(() => {});
    throw error;
  } finally {
    reader.releaseLock();
  }
}

async function readImageProbe(response) {
  if (!response.body) return 0;
  const reader = response.body.getReader();
  try {
    const { value } = await reader.read();
    return value?.byteLength || 0;
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

async function getResponse(url, { fetchImpl, timeoutMs, image }) {
  const controller = new AbortController();
  let timer;
  const timedOut = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`Request timed out after ${timeoutMs} ms`));
      controller.abort();
    }, timeoutMs);
  });
  const operation = (async () => {
    const response = await fetchImpl(url.href, {
      method: 'GET', redirect: 'manual', signal: controller.signal,
      headers: { 'User-Agent': 'Freemy-SEO-Audit/1.0', ...(image ? { Range: 'bytes=0-0' } : {}) }
    });
    const redirect = response.status >= 300 && response.status < 400;
    const protectedPage = response.status === 401 || response.status === 403;
    let text = '', imageBytes = 0;
    if (redirect || protectedPage) await response.body?.cancel().catch(() => {});
    else if (image) imageBytes = await readImageProbe(response);
    else text = await readText(response);
    return { status: response.status, headers: response.headers, text, imageBytes };
  })();
  try { return await Promise.race([operation, timedOut]); }
  finally { clearTimeout(timer); }
}

function noindex(value) {
  return /(?:^|[,;\s:])(?:noindex|none)(?=$|[,;\s])/i.test(value || '');
}

function metadata(html) {
  const found = { canonical: [], alternates: [], robots: [], images: [] };
  const visit = node => {
    const attrs = Object.fromEntries((node.attrs || []).map(item => [item.name.toLowerCase(), item.value]));
    const tag = node.tagName?.toLowerCase();
    const rel = (attrs.rel || '').toLowerCase().split(/\s+/);
    if (tag === 'link' && rel.includes('canonical')) found.canonical.push(attrs.href || '');
    if (tag === 'link' && rel.includes('alternate') && attrs.hreflang) found.alternates.push({ lang: attrs.hreflang.toLowerCase(), href: attrs.href || '' });
    if (tag === 'meta' && /^(robots|googlebot|bingbot)$/i.test(attrs.name || '')) found.robots.push({ name: attrs.name.toLowerCase(), content: attrs.content || '' });
    if (tag === 'meta' && (attrs.property || '').toLowerCase() === 'og:image') found.images.push(attrs.content || '');
    for (const child of node.childNodes || []) visit(child);
  };
  const document = parseHtml(html);
  const root = (document.childNodes || []).find(node => node.tagName === 'html');
  const head = (root?.childNodes || []).find(node => node.tagName === 'head');
  if (head) visit(head);
  return found;
}

function robotsRules(text) {
  const groups = [], sitemaps = [];
  let group = null, hasDirective = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, '').trim();
    const match = /^([^:]+):\s*(.*)$/.exec(line);
    if (!match) continue;
    const key = match[1].trim().toLowerCase(), value = match[2].trim();
    if (key === 'sitemap') sitemaps.push(value);
    else if (key === 'user-agent') {
      if (!group || hasDirective) { group = { agents: [], rules: [] }; groups.push(group); hasDirective = false; }
      group.agents.push(value.toLowerCase());
    } else if (group && (key === 'allow' || key === 'disallow')) {
      hasDirective = true;
      if (value) group.rules.push({ directive: key, value });
    }
  }
  return { groups, sitemaps };
}

function robotsBlocks(rules, pathname) {
  const matching = rules.filter(rule => {
    let pattern = rule.value.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
    if (!pattern.endsWith('$')) pattern += '.*';
    try { return new RegExp(`^${pattern}`).test(pathname); } catch { return false; }
  });
  matching.sort((a, b) => b.value.replace(/\*/g, '').length - a.value.replace(/\*/g, '').length || (a.directive === 'allow' ? -1 : 1));
  return matching[0]?.directive === 'disallow';
}

function inspectSitemap(text) {
  if (/<!DOCTYPE|<!ENTITY/i.test(text) || XMLValidator.validate(text) !== true) throw new Error('Sitemap is not valid, safe XML');
  const parsed = new XMLParser().parse(text);
  if (!parsed.urlset) throw new Error('Sitemap must contain a urlset');
  const entries = parsed.urlset.url ? (Array.isArray(parsed.urlset.url) ? parsed.urlset.url : [parsed.urlset.url]) : [];
  const locations = entries.map(entry => typeof entry.loc === 'string' ? entry.loc : String(entry.loc || ''));
  const issues = [];
  for (const expected of [`${PRODUCTION}/`, `${PRODUCTION}/zh/`, `${PRODUCTION}/en/works/hydraulics/`]) {
    if (!locations.includes(expected)) issues.push(`Sitemap is missing ${expected}`);
  }
  if (new Set(locations).size !== locations.length) issues.push('Sitemap contains duplicate locations');
  for (const location of locations) {
    let url;
    try { url = new URL(location); } catch { issues.push(`Invalid sitemap location: ${location}`); continue; }
    if (url.origin !== PRODUCTION || url.search || url.hash || !url.pathname.endsWith('/') ||
        url.pathname === '/en/' || /\/(?:privacy|submit|404)\/$/.test(url.pathname)) {
      issues.push(`Non-canonical or non-indexable sitemap location: ${location}`);
    }
  }
  return { locations, issues };
}

async function mapLimit(items, concurrency, operation) {
  let next = 0;
  const results = new Array(items.length);
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await operation(items[index]);
    }
  }));
  return results;
}

export async function runAudit({ base = PRODUCTION, limit = DEFAULT_LIMIT, concurrency = 2, timeoutMs = DEFAULT_TIMEOUT_MS, fetchImpl = secureFetch } = {}) {
  const baseUrl = checkedBase(base);
  const preview = baseUrl.hostname.endsWith('.vercel.app');
  const siteBase = preview ? baseUrl : new URL(PRODUCTION);
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) throw new Error(`Limit must be an integer from 1 to ${MAX_LIMIT}`);
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 2) throw new Error('Concurrency must be 1 or 2');
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 30_000) throw new Error('Timeout must be 1–30000 ms');
  if (typeof fetchImpl !== 'function') throw new Error('A fetch function is required');
  let requestsMade = 0;
  const images = new Map();

  const follow = async (initial, image = false) => {
    let current = checkedUrl(initial);
    const redirects = [];
    const visited = new Set();
    for (;;) {
      if (!sameDeployment(current, baseUrl)) throw new Error(`Redirect or request outside the audited deployment: ${current.origin}`);
      if (visited.has(current.href)) throw new Error(`Redirect loop detected at ${current.href}`);
      visited.add(current.href);
      if (requestsMade >= limit) throw new BudgetExhausted('Request limit reached');
      requestsMade++;
      const response = await getResponse(current, { fetchImpl, timeoutMs, image });
      if (response.status < 300 || response.status >= 400 || response.status === 304) {
        return { ...response, url: current.href, redirects };
      }
      const location = response.headers.get('location');
      if (!location) throw new Error(`Redirect ${response.status} has no Location`);
      const next = new URL(location, current);
      // Vercel Authentication can return a redirect instead of 401/403. Do
      // not follow it or write its potentially sensitive query to the report.
      if (preview && next.origin === 'https://vercel.com' && next.pathname === '/sso-api') {
        throw new AccessProtected('Vercel sign-in prevented an audit of this preview resource');
      }
      redirects.push({ status: response.status, url: current.href, location, xRobotsTag: response.headers.get('x-robots-tag') || '' });
      if (redirects.length > MAX_REDIRECTS) throw new Error('Too many redirects');
      current = checkedUrl(next);
    }
  };

  const tasks = [
    { id: 'robots', path: '/robots.txt', type: 'robots' },
    { id: 'sitemap', path: '/sitemap.xml', type: 'sitemap' },
    ...(!preview ? [{ id: 'www-normalization', path: 'https://www.freemy.ai/', type: 'redirect', target: '/' }] : []),
    { id: 'home-en', path: '/', type: 'page', canonical: '/', zh: '/zh/', en: '/' },
    { id: 'home-zh', path: '/zh/', type: 'page', canonical: '/zh/', zh: '/zh/', en: '/' },
    { id: 'en-alias', path: '/en?seo-audit=1', type: 'redirect', target: '/?seo-audit=1' },
    { id: 'en-slash-alias', path: '/en/?seo-audit=1', type: 'redirect', target: '/?seo-audit=1' },
    { id: 'english-deep', path: '/en/works/hydraulics/', type: 'page', canonical: '/en/works/hydraulics/', zh: '/works/hydraulics/', en: '/en/works/hydraulics/' },
    { id: 'trailing-slash', path: '/en/works/hydraulics?seo-audit=1', type: 'redirect', target: '/en/works/hydraulics/?seo-audit=1' },
    { id: 'not-found', path: MISSING_PATH, type: 'not-found' },
    { id: 'noindex-page', path: '/privacy/', type: 'page', canonical: '/privacy/', noindex: true }
  ];

  async function check(task) {
    const requestUrl = new URL(task.path, siteBase);
    const result = { id: task.id, type: task.type, url: requestUrl.href, status: 'pass', issues: [] };
    try {
      const response = await follow(requestUrl, task.type === 'image');
      Object.assign(result, { httpStatus: response.status, finalUrl: response.url, redirects: response.redirects, xRobotsTag: response.headers.get('x-robots-tag') || '' });
      if (response.status === 401 || response.status === 403) {
        result.status = 'blocked';
        result.issues.push('Access protection prevented an audit of this resource');
        return result;
      }
      if (task.type === 'not-found') {
        if (response.status !== 404 || response.redirects.length) result.issues.push('A nonexistent page must return a direct HTTP 404');
      } else if (task.type === 'image') {
        result.contentType = response.headers.get('content-type') || '';
        result.probeBytes = response.imageBytes;
        result.sourceUrls = task.sourceUrls;
        if (![200, 206].includes(response.status) || !/^image\//i.test(result.contentType) || !response.imageBytes) result.issues.push('OG image did not return a nonempty successful image response');
      } else if (response.status !== 200) {
        result.issues.push(`Expected HTTP 200, received ${response.status}`);
      } else if (task.type === 'redirect') {
        const final = new URL(response.url);
        if (!response.redirects.length || response.redirects.some(item => ![301, 308].includes(item.status))) result.issues.push('Expected permanent redirects throughout the chain');
        if (final.origin !== siteBase.origin) result.issues.push(`Expected final origin ${siteBase.origin}`);
        if (`${final.pathname}${final.search}` !== task.target) result.issues.push(`Expected final path and query ${task.target}`);
      } else if (task.type === 'robots') {
        const rules = robotsRules(response.text);
        result.sitemaps = rules.sitemaps;
        result.groups = rules.groups;
        if (!rules.groups.some(group => group.agents.includes('*'))) result.issues.push('robots.txt has no User-agent: * group');
        if (!rules.sitemaps.includes(`${PRODUCTION}/sitemap.xml`)) result.issues.push('robots.txt does not declare the production sitemap');
        for (const agent of ['*', 'googlebot', 'bingbot']) {
          const matching = rules.groups.filter(group => group.agents.includes(agent));
          const applicable = (matching.length ? matching : rules.groups.filter(group => group.agents.includes('*'))).flatMap(group => group.rules);
          for (const pathname of ['/', '/zh/', '/en/works/hydraulics/']) {
            if (robotsBlocks(applicable, pathname)) result.issues.push(`robots.txt blocks ${pathname} for ${agent}`);
          }
        }
      } else if (task.type === 'sitemap') {
        const sitemap = inspectSitemap(response.text);
        result.locationCount = sitemap.locations.length;
        result.issues.push(...sitemap.issues);
      } else if (task.type === 'page') {
        const meta = metadata(response.text);
        result.metadata = meta;
        const expectedCanonical = `${PRODUCTION}${task.canonical}`;
        if (response.redirects.length) result.issues.push('Canonical page must return HTTP 200 directly without a redirect');
        if (new URL(response.url).origin !== siteBase.origin) result.issues.push(`Expected final origin ${siteBase.origin}`);
        if (new URL(response.url).pathname !== task.canonical) result.issues.push(`Expected final page path: ${task.canonical}`);
        if (!/^text\/html(?:;|$)/i.test(response.headers.get('content-type') || '')) result.issues.push('Expected an HTML response');
        if (meta.canonical.length !== 1 || meta.canonical[0] !== expectedCanonical) result.issues.push(`Expected one canonical URL: ${expectedCanonical}`);
        const hasNoindex = noindex(result.xRobotsTag) || meta.robots.some(item => noindex(item.content));
        if (task.noindex && !hasNoindex) result.issues.push('Expected a noindex directive');
        if (!task.noindex && (hasNoindex || response.redirects.some(item => noindex(item.xRobotsTag)))) result.issues.push('Indexable page or its redirect has a noindex directive');
        if (!task.noindex) {
          for (const [lang, target] of [['zh-hans', task.zh], ['en', task.en], ['x-default', task.en]]) {
            const matches = meta.alternates.filter(item => item.lang === lang);
            if (matches.length !== 1 || matches[0].href !== `${PRODUCTION}${target}`) result.issues.push(`Expected ${lang} alternate: ${PRODUCTION}${target}`);
          }
        }
        if (!meta.images.length || !meta.images[0]) result.issues.push('Missing og:image');
        else {
          try {
            const image = checkedUrl(meta.images[0]);
            if (image.hash || (!sameDeployment(image, baseUrl) && !(baseUrl.hostname.endsWith('.vercel.app') && ['freemy.ai', 'www.freemy.ai'].includes(image.hostname)))) {
              throw new Error('OG image is outside the audited deployment');
            }
            // Preview pages name the production image in metadata; check the
            // corresponding asset on the preview rather than production.
            const localImage = new URL(`${image.pathname}${image.search}`, siteBase).href;
            const sources = images.get(localImage) || new Set();
            sources.add(meta.images[0]);
            images.set(localImage, sources);
          } catch (error) { result.issues.push(`Unsafe or external OG image, not fetched: ${error.message}`); }
        }
      }
      if (result.issues.length) result.status = 'fail';
    } catch (error) {
      result.status = error instanceof BudgetExhausted ? 'skipped' : error instanceof AccessProtected ? 'blocked' : 'fail';
      result.issues.push(error?.message || (error?.name ? `Request failed (${error.name})` : 'Request failed'));
    }
    return result;
  }

  const checks = await mapLimit(tasks, concurrency, check);
  const imageTasks = Array.from(images, ([url, sourceUrls], index) => ({ id: `og-image-${index + 1}`, type: 'image', path: url, sourceUrls: [...sourceUrls] }));
  checks.push(...await mapLimit(imageTasks, concurrency, check));
  const summary = Object.fromEntries(['pass', 'fail', 'blocked', 'skipped'].map(status => [status, checks.filter(item => item.status === status).length]));
  const status = summary.fail ? 'fail' : summary.blocked ? 'blocked' : summary.skipped ? 'incomplete' : 'pass';
  return { generatedAt: new Date().toISOString(), base: baseUrl.origin, environment: preview ? 'preview' : 'production', status, limit, requestsMade, concurrency, timeoutMs, summary, checks };
}

function parseArgs(args) {
  const values = { base: PRODUCTION, limit: DEFAULT_LIMIT, concurrency: 2, timeoutMs: DEFAULT_TIMEOUT_MS };
  const names = { '--base': 'base', '--limit': 'limit', '--concurrency': 'concurrency', '--timeout-ms': 'timeoutMs' };
  for (let index = 0; index < args.length; index++) {
    const name = names[args[index]];
    if (!name || index + 1 >= args.length || args[index + 1].startsWith('--')) throw new Error(`Unknown or incomplete option: ${args[index]}`);
    const value = args[++index];
    values[name] = name === 'base' ? value : Number(value);
  }
  return values;
}

function within(root, target) {
  const relative = path.relative(root, target);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

// Resolve the existing prefix and any dangling final symlink as the static
// audit does, so a link cannot hide a destination inside the built site.
async function resolvedPath(target, visited = new Set()) {
  let current = path.resolve(target);
  const missing = [];
  for (;;) {
    try { return path.resolve(await fs.realpath(current), ...missing.reverse()); }
    catch (error) {
      if (error.code !== 'ENOENT') throw error;
      try {
        if ((await fs.lstat(current)).isSymbolicLink()) {
          if (visited.has(current)) throw new Error('Cyclic report path link');
          visited.add(current);
          const link = await fs.readlink(current);
          return resolvedPath(path.resolve(path.dirname(current), link, ...missing.reverse()), visited);
        }
      } catch (linkError) {
        if (linkError.code !== 'ENOENT') throw linkError;
      }
      const parent = path.dirname(current);
      if (parent === current) throw error;
      missing.push(path.basename(current));
      current = parent;
    }
  }
}

async function safeReportPaths(root) {
  const realRoot = await fs.realpath(root);
  const directory = path.resolve(root, 'reports', 'seo');
  const file = path.join(directory, 'live-audit.json');
  const expectedDirectory = path.join(realRoot, 'reports', 'seo');
  const expectedFile = path.join(expectedDirectory, 'live-audit.json');
  const site = await resolvedPath(path.join(root, 'dist'));
  const realDirectory = await resolvedPath(directory);
  const realFile = await resolvedPath(file);
  if (within(site, realDirectory) || within(site, realFile) ||
      path.relative(expectedDirectory, realDirectory) !== '' || path.relative(expectedFile, realFile) !== '') {
    throw new Error('Audit report must remain in the report directory outside the built site');
  }
  try {
    const existing = await fs.lstat(file);
    if (existing.isSymbolicLink() || !existing.isFile() || existing.nlink > 1) throw new Error('Unsafe report file link');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  return { directory, file };
}

export async function writeAuditReport(report, root = ROOT) {
  let { directory, file } = await safeReportPaths(root);
  await fs.mkdir(directory, { recursive: true });
  ({ directory, file } = await safeReportPaths(root));
  const temporary = path.join(directory, `.live-audit-${randomUUID()}.tmp`);
  try {
    await fs.writeFile(temporary, `${JSON.stringify(report, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
    await safeReportPaths(root);
    await fs.rename(temporary, file);
  } finally {
    await fs.unlink(temporary).catch(error => { if (error.code !== 'ENOENT') throw error; });
  }
  return file;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const report = await runAudit(options);
  const file = await writeAuditReport(report);
  console.log(`SEO live audit: ${report.status}; ${report.requestsMade}/${report.limit} requests; report: ${file}`);
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main().catch(error => { console.error(`SEO live audit failed: ${error.message}`); process.exitCode = 1; });
}
