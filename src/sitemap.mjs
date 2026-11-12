import { escapeHtml as e } from './catalog.mjs';
import { SITE_ORIGIN, siteUrl } from './site-config.mjs';

export function renderSitemap(manifest, catalog) {
  const items=manifest.filter(page=>page.indexable&&page.includeInSitemap).map(page=>{
    const work=page.kind==='work'?catalog.works.find(w=>w.id===page.entityId):null;
    const image=work?.media?.poster?.src;
    return `<url><loc>${e(siteUrl(page.path))}</loc>${page.contentUpdatedAt?`<lastmod>${e(page.contentUpdatedAt)}</lastmod>`:''}${image?`<image:image><image:loc>${e(siteUrl(image))}</image:loc></image:image>`:''}</url>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">${items.join('')}</urlset>`;
}

export function renderRobots({origin=SITE_ORIGIN}={}) {
  if(origin!==SITE_ORIGIN) throw new Error('Robots sitemap must use the canonical origin');
  return `User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`;
}
