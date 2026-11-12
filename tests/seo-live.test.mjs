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
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
