import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import dns from 'node:dns';
import https from 'node:https';
import { EventEmitter } from 'node:events';
import { Readable } from 'node:stream';
import { createSafeLookup, runAudit, writeAuditReport } from '../scripts/check-seo-live.mjs';

const origin = 'https://freemy.ai';

function html(canonical, zh, en, { robots = '', image = `${origin}/og/home.jpg` } = {}) {
  return `<!doctype html><html><head>
    <link rel="canonical" href="${canonical}">
    ${zh ? `<link rel="alternate" hreflang="zh-Hans" href="${zh}">` : ''}
    ${en ? `<link rel="alternate" hreflang="en" href="${en}"><link rel="alternate" hreflang="x-default" href="${en}">` : ''}
    ${robots ? `<meta name="robots" content="${robots}">` : ''}
    <meta property="og:image" content="${image}">
  </head><body>Freemy</body></html>`;
}

function goodFetch({ change, delay = 0 } = {}) {
  const calls = [];
  let active = 0, maximum = 0;
  const fetchImpl = async (value, options) => {
    const url = new URL(value);
    calls.push(url.href);
    active++;
    maximum = Math.max(maximum, active);
    try {
      if (delay) await new Promise(resolve => setTimeout(resolve, delay));
      const override = change?.(url, options);
      if (override) return override;
      if (url.hostname === 'www.freemy.ai') {
        return new Response(null, { status: 308, headers: { location: `${origin}${url.pathname}${url.search}` } });
      }
      if (url.pathname === '/en' || url.pathname === '/en/') {
        return new Response(null, { status: 308, headers: { location: `/${url.search}` } });
      }
      if (url.pathname === '/en/works/hydraulics') {
        return new Response(null, { status: 308, headers: { location: `/en/works/hydraulics/${url.search}` } });
      }
      if (url.pathname === '/robots.txt') return new Response(`User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`);
      if (url.pathname === '/sitemap.xml') return new Response(`<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        <url><loc>${origin}/</loc></url><url><loc>${origin}/zh/</loc></url><url><loc>${origin}/en/works/hydraulics/</loc></url>
      </urlset>`, { headers: { 'content-type': 'application/xml' } });
      if (url.pathname === '/') return new Response(html(`${origin}/`, `${origin}/zh/`, `${origin}/`), { headers: { 'content-type': 'text/html' } });
      if (url.pathname === '/zh/') return new Response(html(`${origin}/zh/`, `${origin}/zh/`, `${origin}/`), { headers: { 'content-type': 'text/html' } });
      if (url.pathname === '/en/works/hydraulics/') return new Response(html(`${origin}/en/works/hydraulics/`, `${origin}/works/hydraulics/`, `${origin}/en/works/hydraulics/`), { headers: { 'content-type': 'text/html' } });
      if (url.pathname === '/privacy/') return new Response(html(`${origin}/privacy/`, '', '', { robots: 'noindex,follow' }), { headers: { 'content-type': 'text/html' } });
      if (url.pathname === '/og/home.jpg') return new Response('x', { status: 206, headers: { 'content-type': 'image/jpeg' } });
      return new Response('Not found', { status: 404, headers: { 'content-type': 'text/html' } });
    } finally {
      active--;
    }
  };
  return { fetchImpl, calls, maximum: () => maximum };
}

test('rejects non-HTTPS, private, lookalike, credentialed and non-preview bases before requesting them', async () => {
  const bad = [
    'http://freemy.ai', 'https://localhost', 'https://127.0.0.1', 'https://10.0.0.1',
    'https://[::1]', 'https://freemy.ai.example.com', 'https://evilfreemy.ai',
    'https://vercel.app', 'https://-fake.vercel.app', 'https://fake-.vercel.app',
    'https://user@freemy.ai', 'https://freemy.ai:8443', 'https://freemy.ai/path'
  ];
  for (const base of bad) {
    let called = false;
    await assert.rejects(runAudit({ base, fetchImpl: () => { called = true; } }));
    assert.equal(called, false, base);
  }
});

test('rejects private DNS results, including a mixed public and private answer', async () => {
  async function lookup(records) {
    const safe = createSafeLookup((_name, _options, callback) => callback(null, records));
    return await new Promise((resolve, reject) => safe('freemy.ai', { all: true }, (error, value) => error ? reject(error) : resolve(value)));
  }
  await assert.rejects(lookup([{ address: '127.0.0.1', family: 4 }]));
  await assert.rejects(lookup([{ address: '8.8.8.8', family: 4 }, { address: '192.168.0.1', family: 4 }]));
  await assert.rejects(lookup([{ address: '::1', family: 6 }]));
  await assert.rejects(lookup([{ address: '::ffff:c0a8:1', family: 6 }]));
  await assert.rejects(lookup([{ address: '2001::7f00:1', family: 6 }]));
  await assert.rejects(lookup([{ address: '2001:2::1', family: 6 }]));
  await assert.rejects(lookup([{ address: '3fff::1', family: 6 }]));
  await assert.rejects(lookup([{ address: '192.88.99.1', family: 4 }]));
  assert.deepEqual(await lookup([{ address: '8.8.8.8', family: 4 }]), [{ address: '8.8.8.8', family: 4 }]);
});

test('default transport supplies its validated DNS lookup to the HTTPS connection', async t => {
  let passedLookup = false;
  t.mock.method(dns, 'lookup', (_host, _options, callback) => callback(null, [{ address: '127.0.0.1', family: 4 }]));
  t.mock.method(https, 'request', (url, options, respond) => {
    const request = new EventEmitter();
    request.end = () => {
      passedLookup = typeof options.lookup === 'function';
      options.lookup(url.hostname, { all: true }, error => {
        if (error) request.emit('error', error);
        else {
          const response = Readable.from(['should never be reached']);
          response.statusCode = 200;
          response.headers = { 'content-type': 'text/plain' };
          respond(response);
        }
      });
    };
    return request;
  });
  const report = await runAudit({ base: origin, limit: 1 });
  assert.equal(passedLookup, true);
  assert.equal(report.status, 'fail');
  assert.match(report.checks[0].issues.join(' '), /non-public/);
});

test('default transport can read an HTTPS response after a public DNS answer', async t => {
  t.mock.method(dns, 'lookup', (_host, _options, callback) => callback(null, [{ address: '8.8.8.8', family: 4 }]));
  t.mock.method(https, 'request', (url, options, respond) => {
    const request = new EventEmitter();
    request.end = () => options.lookup(url.hostname, { all: true }, error => {
      if (error) request.emit('error', error);
      else {
        const response = Readable.from([`User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`]);
        response.statusCode = 200;
        response.headers = { 'content-type': 'text/plain' };
        respond(response);
      }
    });
    return request;
  });
  const report = await runAudit({ base: origin, limit: 1 });
  assert.equal(report.checks.find(check => check.id === 'robots').status, 'pass');
  assert.equal(report.status, 'incomplete');
});

test('counts every redirect and image request within the limit and never exceeds two simultaneous requests', async () => {
  const fake = goodFetch({ delay: 4 });
  const report = await runAudit({ base: origin, limit: 3, concurrency: 2, fetchImpl: fake.fetchImpl });
  assert.equal(report.requestsMade, 3);
  assert.equal(fake.calls.length, 3);
  assert.ok(fake.maximum() <= 2);
  assert.equal(report.status, 'incomplete');
  await assert.rejects(runAudit({ base: origin, concurrency: 3, fetchImpl: fake.fetchImpl }));
  await assert.rejects(runAudit({ base: origin, limit: 0, fetchImpl: fake.fetchImpl }));
});

test('passes a healthy representative audit and checks redirect destinations and image resources', async () => {
  const fake = goodFetch();
  const report = await runAudit({ base: origin, limit: 20, fetchImpl: fake.fetchImpl });
  assert.equal(report.status, 'pass', JSON.stringify(report.checks, null, 2));
  assert.ok(fake.calls.some(value => value === `${origin}/en/works/hydraulics/`));
  assert.ok(fake.calls.some(value => value.startsWith(`${origin}/og/home.jpg`)));
  assert.ok(report.checks.some(check => check.id === 'en-alias' && check.status === 'pass'));
  assert.ok(report.checks.some(check => check.id === 'en-slash-alias' && check.status === 'pass'));
  assert.ok(report.checks.some(check => check.id === 'trailing-slash' && check.status === 'pass'));
  assert.ok(report.checks.some(check => check.id === 'not-found' && check.httpStatus === 404));
});

test('checks that the www homepage permanently redirects to the production apex', async () => {
  const fake = goodFetch();
  const report = await runAudit({ base: origin, limit: 20, fetchImpl: fake.fetchImpl });
  const check = report.checks.find(item => item.id === 'www-normalization');
  assert.equal(check.status, 'pass');
  assert.equal(check.url, 'https://www.freemy.ai/');
  assert.equal(check.finalUrl, 'https://freemy.ai/');
  assert.deepEqual(check.redirects.map(item => item.status), [308]);
  assert.ok(fake.calls.includes('https://www.freemy.ai/'));
});

test('fails when www responds directly instead of redirecting to the apex', async () => {
  for (const base of [origin, 'https://www.freemy.ai']) {
    const fake = goodFetch({ change: url => url.origin === 'https://www.freemy.ai' && url.pathname === '/' ?
      new Response(html(`${origin}/`, `${origin}/zh/`, `${origin}/`), { headers: { 'content-type': 'text/html' } }) : null });
    const report = await runAudit({ base, limit: 20, fetchImpl: fake.fetchImpl });
    assert.equal(report.status, 'fail');
    assert.equal(report.checks.find(item => item.id === 'www-normalization').status, 'fail');
  }
});

test('fails when www uses a temporary redirect to the apex', async () => {
  const fake = goodFetch({ change: url => url.origin === 'https://www.freemy.ai' && url.pathname === '/' ?
    new Response(null, { status: 302, headers: { location: `${origin}/` } }) : null });
  const report = await runAudit({ base: origin, limit: 20, fetchImpl: fake.fetchImpl });
  assert.equal(report.checks.find(item => item.id === 'www-normalization').status, 'fail');
});

test('marks the www check incomplete if the budget runs out during its redirect', async () => {
  const fake = goodFetch();
  const report = await runAudit({ base: origin, limit: 3, concurrency: 1, fetchImpl: fake.fetchImpl });
  assert.equal(report.requestsMade, 3);
  assert.equal(fake.calls.length, 3);
  assert.equal(report.checks.find(item => item.id === 'www-normalization').status, 'skipped');
  assert.equal(report.status, 'incomplete');
});

test('reports an access-protected www homepage as blocked', async () => {
  const fake = goodFetch({ change: url => url.origin === 'https://www.freemy.ai' && url.pathname === '/' ?
    new Response(null, { status: 403 }) : null });
  const report = await runAudit({ base: origin, limit: 20, fetchImpl: fake.fetchImpl });
  assert.equal(report.checks.find(item => item.id === 'www-normalization').status, 'blocked');
  assert.equal(report.status, 'blocked');
});

test('audits apex canonical pages directly when the requested base is www', async () => {
  const fake = goodFetch();
  const report = await runAudit({ base: 'https://www.freemy.ai', limit: 20, fetchImpl: fake.fetchImpl });
  assert.equal(report.status, 'pass', JSON.stringify(report.checks, null, 2));
  assert.equal(report.base, 'https://www.freemy.ai');
  assert.equal(report.checks.find(item => item.id === 'www-normalization').finalUrl, 'https://freemy.ai/');
  for (const id of ['home-en', 'home-zh', 'english-deep', 'noindex-page']) {
    const check = report.checks.find(item => item.id === id);
    assert.equal(new URL(check.url).origin, origin);
    assert.equal(new URL(check.finalUrl).origin, origin);
    assert.deepEqual(check.redirects, []);
  }
});

test('fails when a production canonical page redirects, even to the same path or www', async () => {
  const redirects = [
    url => url.origin === origin && url.pathname === '/zh/' && !url.search ?
      new Response(null, { status: 308, headers: { location: '/zh/?through=redirect' } }) : null,
    url => {
      if (url.origin === origin && url.pathname === '/zh/') return new Response(null, { status: 308, headers: { location: 'https://www.freemy.ai/zh/' } });
      if (url.origin === 'https://www.freemy.ai' && url.pathname === '/zh/') return new Response(
        html(`${origin}/zh/`, `${origin}/zh/`, `${origin}/`), { headers: { 'content-type': 'text/html' } });
      return null;
    }
  ];
  for (const change of redirects) {
    const report = await runAudit({ base: origin, limit: 20, fetchImpl: goodFetch({ change }).fetchImpl });
    assert.equal(report.checks.find(item => item.id === 'home-zh').status, 'fail');
    assert.equal(report.status, 'fail');
  }
});

test('detects www-to-apex redirect loops within the request budget', async () => {
  const fake = goodFetch({ change: url => {
    if (url.origin === 'https://www.freemy.ai' && url.pathname === '/') return new Response(null, { status: 308, headers: { location: `${origin}/` } });
    if (url.origin === origin && url.pathname === '/') return new Response(null, { status: 308, headers: { location: 'https://www.freemy.ai/' } });
    return null;
  } });
  const report = await runAudit({ base: origin, limit: 20, fetchImpl: fake.fetchImpl });
  const check = report.checks.find(item => item.id === 'www-normalization');
  assert.equal(check.status, 'fail');
  assert.match(check.issues.join(' '), /loop|cycle/i);
  assert.ok(report.requestsMade <= 20);
});

test('never follows an unsafe redirect or an unrelated Vercel deployment', async () => {
  for (const target of ['https://127.0.0.1/private', 'http://freemy.ai/', 'https://other-project.vercel.app/']) {
    const fake = goodFetch({ change: url => url.pathname === '/en' ? new Response(null, { status: 308, headers: { location: target } }) : null });
    const report = await runAudit({ base: origin, limit: 20, fetchImpl: fake.fetchImpl });
    assert.equal(report.status, 'fail');
    assert.equal(report.checks.find(check => check.id === 'en-alias').status, 'fail');
    assert.ok(!fake.calls.includes(target));
  }
});

test('requires every alias redirect in a chain to be permanent', async () => {
  const fake = goodFetch({ change: url => {
    if (url.pathname === '/en') return new Response(null, { status: 301, headers: { location: `/intermediate${url.search}` } });
    if (url.pathname === '/intermediate') return new Response(null, { status: 302, headers: { location: `/${url.search}` } });
    return null;
  } });
  const report = await runAudit({ base: origin, limit: 20, fetchImpl: fake.fetchImpl });
  assert.equal(report.checks.find(check => check.id === 'en-alias').status, 'fail');
});

test('detects redirects that lose the original query string', async () => {
  const fake = goodFetch({ change: url => url.pathname === '/en' ? new Response(null, { status: 308, headers: { location: '/' } }) : null });
  const report = await runAudit({ base: origin, limit: 20, fetchImpl: fake.fetchImpl });
  assert.equal(report.checks.find(check => check.id === 'en-alias').status, 'fail');
});

test('fails an alias whose final page remains on www even if the path is correct', async () => {
  const fake = goodFetch({ change: url => {
    if (url.origin === origin && url.pathname === '/en') return new Response(null, { status: 308, headers: { location: `https://www.freemy.ai/${url.search}` } });
    if (url.origin === 'https://www.freemy.ai' && url.pathname === '/' && url.search) return new Response(
      html(`${origin}/`, `${origin}/zh/`, `${origin}/`), { headers: { 'content-type': 'text/html' } });
    return null;
  } });
  const report = await runAudit({ base: origin, limit: 20, fetchImpl: fake.fetchImpl });
  assert.equal(report.checks.find(check => check.id === 'en-alias').status, 'fail');
});

test('flags noindex in HTML and X-Robots-Tag on an indexable page', async () => {
  for (const mode of ['meta', 'header']) {
    const fake = goodFetch({ change: url => url.pathname === '/zh/' ? new Response(
      html(`${origin}/zh/`, `${origin}/zh/`, `${origin}/`, { robots: mode === 'meta' ? 'noindex,follow' : '' }),
      { headers: { 'content-type': 'text/html', ...(mode === 'header' ? { 'x-robots-tag': 'googlebot: noindex' } : {}) } }
    ) : null });
    const report = await runAudit({ base: origin, limit: 20, fetchImpl: fake.fetchImpl });
    assert.equal(report.status, 'fail');
    assert.equal(report.checks.find(check => check.id === 'home-zh').status, 'fail');
  }
});

test('labels access-protected responses blocked instead of passing', async () => {
  for (const status of [401, 403]) {
    const report = await runAudit({ base: origin, limit: 20, fetchImpl: async () => new Response('Protected', { status }) });
    assert.equal(report.status, 'blocked');
    assert.ok(report.checks.some(check => check.status === 'blocked' && check.httpStatus === status));
    assert.ok(!report.checks.some(check => check.status === 'pass'));
  }
});

test('marks a protected OG image blocked', async () => {
  const fake = goodFetch({ change: url => url.pathname === '/og/home.jpg' ? new Response(null, { status: 403 }) : null });
  const report = await runAudit({ base: origin, limit: 20, fetchImpl: fake.fetchImpl });
  assert.equal(report.status, 'blocked');
  assert.ok(report.checks.some(check => check.type === 'image' && check.status === 'blocked'));
});

test('reports robots restrictions, malformed sitemaps and missing page directives', async () => {
  const cases = [
    ['robots', url => url.pathname === '/robots.txt' ? new Response(`User-agent: *\nDisallow: /en/\nSitemap: ${origin}/sitemap.xml\n`) : null],
    ['robots', url => url.pathname === '/robots.txt' ? new Response(`User-agent: *\nAllow: /\nUser-agent: Googlebot\nDisallow: /en/\nSitemap: ${origin}/sitemap.xml\n`) : null],
    ['robots', url => url.pathname === '/robots.txt' ? new Response(`User-agent: *\nAllow: /\nUser-agent: Bingbot\nDisallow: /\nSitemap: ${origin}/sitemap.xml\n`) : null],
    ['sitemap', url => url.pathname === '/sitemap.xml' ? new Response('<urlset><url>') : null],
    ['noindex-page', url => url.pathname === '/privacy/' ? new Response(html(`${origin}/privacy/`, '', ''), { headers: { 'content-type': 'text/html' } }) : null],
    ['home-zh', url => url.pathname === '/zh/' ? new Response(html(`${origin}/zh/`, `${origin}/zh/`, `${origin}/`).replace('hreflang="x-default"', 'hreflang="xx"'), { headers: { 'content-type': 'text/html' } }) : null]
  ];
  for (const [id, change] of cases) {
    const report = await runAudit({ base: origin, limit: 20, fetchImpl: goodFetch({ change }).fetchImpl });
    assert.equal(report.checks.find(check => check.id === id).status, 'fail', id);
  }
});

test('does not apply another crawler’s robots group to the wildcard group', async () => {
  const fake = goodFetch({ change: url => url.pathname === '/robots.txt' ? new Response(
    `User-agent: *\nDisallow:\n\nUser-agent: ExampleBot\nDisallow: /\nSitemap: ${origin}/sitemap.xml\n`
  ) : null });
  const report = await runAudit({ base: origin, limit: 20, fetchImpl: fake.fetchImpl });
  assert.equal(report.checks.find(check => check.id === 'robots').status, 'pass');
});

test('reports HTTP failures, soft 404s, broken images and bad metadata as failures', async () => {
  const overrides = [
    url => url.pathname === '/robots.txt' ? new Response('Oops', { status: 500 }) : null,
    url => url.pathname.startsWith('/__freemy-seo-audit-') ? new Response('Not found', { status: 200 }) : null,
    url => url.pathname === '/og/home.jpg' ? new Response('Missing', { status: 404 }) : null,
    url => url.pathname === '/og/home.jpg' ? new Response(null, { status: 200, headers: { 'content-type': 'image/jpeg' } }) : null,
    url => url.pathname === '/zh/' ? new Response(html(`${origin}/`, `${origin}/zh/`, `${origin}/`)) : null
  ];
  for (const change of overrides) {
    const fake = goodFetch({ change });
    const report = await runAudit({ base: origin, limit: 20, fetchImpl: fake.fetchImpl });
    assert.equal(report.status, 'fail');
    assert.ok(report.checks.some(check => check.status === 'fail'));
  }
});

test('requires metadata in the document head', async () => {
  const fake = goodFetch({ change: url => url.pathname === '/zh/' ? new Response(
    `<html><head></head><body>${html(`${origin}/zh/`, `${origin}/zh/`, `${origin}/`)}</body></html>`
  ) : null });
  const report = await runAudit({ base: origin, limit: 20, fetchImpl: fake.fetchImpl });
  assert.equal(report.checks.find(check => check.id === 'home-zh').status, 'fail');
});

test('never fetches an OG image hosted by an unrelated site', async () => {
  const external = 'https://example.org/original-work.jpg';
  const fake = goodFetch({ change: url => url.pathname === '/zh/' ? new Response(html(`${origin}/zh/`, `${origin}/zh/`, `${origin}/`, { image: external })) : null });
  const report = await runAudit({ base: origin, limit: 20, fetchImpl: fake.fetchImpl });
  assert.equal(report.status, 'fail');
  assert.ok(!fake.calls.includes(external));
});

test('audits preview assets on the preview host while expecting production canonical metadata', async () => {
  const fake = goodFetch();
  const base = 'https://freemy-git-preview.vercel.app';
  const report = await runAudit({ base, limit: 20, fetchImpl: fake.fetchImpl });
  assert.equal(report.status, 'pass', JSON.stringify(report.checks, null, 2));
  assert.ok(fake.calls.every(value => new URL(value).origin === base));
  assert.ok(fake.calls.includes(`${base}/og/home.jpg`));
});

test('requires preview canonical pages to return directly and never follows a preview redirect to production', async () => {
  const base = 'https://freemy-git-preview.vercel.app';
  for (const target of ['/zh/?redirect=1', `${origin}/zh/`]) {
    const fake = goodFetch({ change: url => url.pathname === '/zh/' && !url.search ?
      new Response(null, { status: 308, headers: { location: target } }) : null });
    const report = await runAudit({ base, limit: 20, fetchImpl: fake.fetchImpl });
    assert.equal(report.checks.find(item => item.id === 'home-zh').status, 'fail');
    assert.ok(fake.calls.every(value => new URL(value).origin === base));
    assert.ok(!report.checks.some(item => item.id === 'www-normalization'));
  }
});

test('times out a stalled request and reports it as a failure', async () => {
  const report = await runAudit({ base: origin, limit: 1, timeoutMs: 20, fetchImpl: () => new Promise(() => {}) });
  assert.equal(report.status, 'fail');
  assert.ok(report.checks.some(check => check.status === 'fail' && /timed out/i.test(check.issues.join(' '))));
});

test('writes the audit as JSON beneath reports/seo', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'freemy-audit-'));
  try {
    const report = await runAudit({ base: origin, limit: 20, fetchImpl: goodFetch().fetchImpl });
    const destination = await writeAuditReport(report, root);
    assert.equal(destination, path.join(root, 'reports', 'seo', 'live-audit.json'));
    assert.deepEqual(JSON.parse(await fs.readFile(destination, 'utf8')), report);
    const replacement = { status: 'fail' };
    assert.equal(await writeAuditReport(replacement, root), destination);
    assert.deepEqual(JSON.parse(await fs.readFile(destination, 'utf8')), replacement);
    assert.deepEqual(await fs.readdir(path.dirname(destination)), ['live-audit.json']);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('refuses a report directory junction that leaves the project', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'freemy-live-project-'));
  const outside = await fs.mkdtemp(path.join(os.tmpdir(), 'freemy-live-outside-'));
  try {
    await fs.symlink(outside, path.join(root, 'reports'), process.platform === 'win32' ? 'junction' : 'dir');
    await assert.rejects(writeAuditReport({ status: 'pass' }, root), /report|outside|unsafe/i);
    assert.deepEqual(await fs.readdir(outside), []);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
    await fs.rm(outside, { recursive: true, force: true });
  }
});

test('refuses a reports directory junction into dist without creating files there', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'freemy-live-junction-'));
  try {
    const dist = path.join(root, 'dist');
    await fs.mkdir(dist);
    await fs.symlink(dist, path.join(root, 'reports'), process.platform === 'win32' ? 'junction' : 'dir');
    await assert.rejects(writeAuditReport({ status: 'pass' }, root), /report|outside|unsafe/i);
    await assert.rejects(fs.stat(path.join(dist, 'seo')), { code: 'ENOENT' });
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('refuses a reports/seo junction into dist without changing built files', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'freemy-live-seo-junction-'));
  try {
    const dist = path.join(root, 'dist'), reports = path.join(root, 'reports');
    await fs.mkdir(dist);
    await fs.mkdir(reports);
    await fs.writeFile(path.join(dist, 'live-audit.json'), 'keep');
    await fs.symlink(dist, path.join(reports, 'seo'), process.platform === 'win32' ? 'junction' : 'dir');
    await assert.rejects(writeAuditReport({ status: 'pass' }, root), /report|outside|unsafe/i);
    assert.equal(await fs.readFile(path.join(dist, 'live-audit.json'), 'utf8'), 'keep');
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('does not overwrite a built file through a report file link', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'freemy-live-file-link-'));
  try {
    const dist = path.join(root, 'dist'), reportDir = path.join(root, 'reports', 'seo');
    await fs.mkdir(dist);
    await fs.mkdir(reportDir, { recursive: true });
    const target = path.join(dist, 'published.json');
    await fs.writeFile(target, 'keep');
    try { await fs.symlink(target, path.join(reportDir, 'live-audit.json'), 'file'); }
    catch (error) {
      if (['EPERM', 'EACCES', 'ENOSYS'].includes(error.code)) { t.skip('Creating file symlinks is unavailable'); return; }
      throw error;
    }
    await assert.rejects(writeAuditReport({ status: 'pass' }, root), /report|outside|unsafe/i);
    assert.equal(await fs.readFile(target, 'utf8'), 'keep');
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('does not write into dist through a dangling report file link', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'freemy-live-dangling-link-'));
  try {
    const dist = path.join(root, 'dist'), reportDir = path.join(root, 'reports', 'seo');
    await fs.mkdir(dist);
    await fs.mkdir(reportDir, { recursive: true });
    const target = path.join(dist, 'not-yet-created.json');
    try { await fs.symlink(target, path.join(reportDir, 'live-audit.json'), 'file'); }
    catch (error) {
      if (['EPERM', 'EACCES', 'ENOSYS'].includes(error.code)) { t.skip('Creating file symlinks is unavailable'); return; }
      throw error;
    }
    await assert.rejects(writeAuditReport({ status: 'pass' }, root), /report|outside|unsafe/i);
    await assert.rejects(fs.stat(target), { code: 'ENOENT' });
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('does not overwrite a built file through a hard-linked report', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'freemy-live-hard-link-'));
  try {
    const dist = path.join(root, 'dist'), reportDir = path.join(root, 'reports', 'seo');
    await fs.mkdir(dist);
    await fs.mkdir(reportDir, { recursive: true });
    const target = path.join(dist, 'published.json');
    await fs.writeFile(target, 'keep');
    await fs.link(target, path.join(reportDir, 'live-audit.json'));
    try { await writeAuditReport({ status: 'pass' }, root); } catch { /* Refusing the link is also safe. */ }
    assert.equal(await fs.readFile(target, 'utf8'), 'keep');
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
