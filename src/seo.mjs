import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { escapeHtml as e } from './catalog.mjs';
import { messages, topicNames } from './i18n.mjs';
import { siteUrl, CUSTOM_EVENTS_ENABLED, IMPRESSIONS_ENABLED } from './site-config.mjs';
import { buildStructuredData, serializeJsonLd } from './structured-data.mjs';

const assets = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../assets');
const hasAsset = value => fs.existsSync(path.join(assets, value.replace(/^\//, '')));
const withBrand = (title, locale) => /freemy/i.test(title) ? title : `${title}${locale==='zh'?'｜':' | '}Freemy`;

function contentFor(page, catalog) {
  const locale=page.locale, m=messages[locale], zh=locale==='zh';
  if(page.kind==='home') return {title:zh?'Freemy｜AI 创意作品、互动实验与网页游戏':'Freemy — AI Games, Interactive Experiments & Creative Apps',description:m.intro};
  if(page.kind==='explore') return {title:withBrand(m.explore,locale),description:zh?'浏览精选互动作品、实验、游戏和创意应用，查看真实预览并打开原作。':'Browse interactive creations, experiments, games and creative apps, with real previews and links to the originals.'};
  if(page.kind==='collectionIndex') return {title:withBrand(m.collections,locale),description:zh?'按兴趣浏览 Freemy 精选合集，发现游戏、声音、机械和更多互动作品。':'Explore curated collections of games, sound, machines and other interactive creations.'};
  if(page.kind==='type') {
    const item=catalog.types.find(x=>x.id===page.entityId), copy=item?.seo?.[locale];
    return {title:copy?.title||withBrand(item?.[locale]||page.entityId,locale),description:copy?.description||`${item?.[locale]||page.entityId} — ${m.intro}`};
  }
  if(page.kind==='collection') {
    const item=catalog.collections.find(x=>x.id===page.entityId), copy=item?.seo?.[locale];
    return {title:copy?.title||withBrand(item?.[locale]?.title||page.entityId,locale),description:copy?.description||item?.[locale]?.summary||m.collectionIntro};
  }
  if(page.kind==='work') {
    const item=catalog.works.find(x=>x.id===page.entityId), copy=item?.seo?.[locale], text=item?.locales?.[locale];
    return {title:copy?.title||withBrand(text?.title||page.entityId,locale),description:copy?.description||text?.summary||m.intro};
  }
  if(page.kind==='topic') {
    const name=topicNames[page.entityId]?.[zh?0:1]||page.entityId;
    return {title:withBrand(name,locale),description:zh?`浏览与${name}相关的互动作品，查看预览、作者及原站入口。`:`Explore interactive creations about ${name}, with previews, creator credits and links to the originals.`};
  }
  if(page.kind==='about') return {title:withBrand(m.about,locale),description:zh?m.aboutText:'Freemy curates interactive AI creations and references, credits their creators, and links directly to the original experiences.'};
  if(page.kind==='privacy') return {title:withBrand(m.privacy,locale),description:zh?'了解 Freemy 的访问统计、语言设置及第三方链接。':'Learn about Freemy analytics, language preferences and third-party links.'};
  if(page.kind==='submit') return {title:withBrand(m.submit,locale),description:m.submitText};
  return {title:withBrand('404',locale),description:m.notFound};
}

function shareImage(page, catalog) {
  const work=page.kind==='work'?catalog.works.find(x=>x.id===page.entityId):null;
  const candidate=page.kind==='home'?'/og/home.jpg':page.kind==='collection'?`/og/collection-${page.entityId}.jpg`:work?.media?.poster?`/og/work-${work.slug}.jpg`:'/og/fallback.jpg';
  const brandAlt=page.locale==='zh'?'Freemy 品牌图':'Freemy brand image';
  const alt=work?.media?.poster?`${work.locales[page.locale].title} — ${page.locale==='zh'?'作品预览':'creation preview'}`:page.kind==='collection'?(catalog.collections.find(x=>x.id===page.entityId)?.[page.locale]?.title||brandAlt):brandAlt;
  if(hasAsset(candidate)) return {url:siteUrl(candidate),alt,width:1200,height:630,type:'image/jpeg'};
  if(work?.media?.poster) {
    const poster=work.media.poster;
    return {url:siteUrl(poster.src),alt,width:960,height:Math.round(poster.height*960/poster.width),type:'image/webp'};
  }
  if(hasAsset('/og/fallback.jpg')) return {url:siteUrl('/og/fallback.jpg'),alt:brandAlt,width:1200,height:630,type:'image/jpeg'};
  return null;
}

export function buildSeo(page, manifest, catalog) {
  if(!page) throw new Error('A page manifest record is required');
  const content=contentFor(page,catalog), canonical=siteUrl(page.path), alternates={};
  if(page.indexable) {
    const siblings=manifest.filter(p=>p.kind===page.kind&&p.entityId===page.entityId&&p.indexable);
    const zh=siblings.find(p=>p.locale==='zh'), en=siblings.find(p=>p.locale==='en');
    if(zh) alternates['zh-Hans']=siteUrl(zh.path);
    if(en) { alternates.en=siteUrl(en.path); alternates['x-default']=siteUrl(en.path); }
  }
  return {...content,canonical,alternates,robots:page.indexable?null:'noindex,follow',pageType:page.kind,analyticsEnabled:CUSTOM_EVENTS_ENABLED,impressionsEnabled:IMPRESSIONS_ENABLED,og:{image:shareImage(page,catalog),locale:page.locale==='zh'?'zh_CN':'en_US',alternateLocale:page.locale==='zh'?'en_US':'zh_CN'},jsonLd:buildStructuredData(page,manifest,catalog).map(serializeJsonLd)};
}

export function renderSeoHead(meta) {
  const tags=[`<title>${e(meta.title)}</title>`,`<meta name="description" content="${e(meta.description)}">`];
  if(meta.robots) tags.push(`<meta name="robots" content="${e(meta.robots)}">`);
  tags.push(`<link rel="canonical" href="${e(meta.canonical)}">`);
  for(const [lang,url] of Object.entries(meta.alternates||{})) tags.push(`<link rel="alternate" hreflang="${e(lang)}" href="${e(url)}">`);
  tags.push(`<meta property="og:type" content="website">`,`<meta property="og:site_name" content="Freemy">`,`<meta property="og:title" content="${e(meta.title)}">`,`<meta property="og:description" content="${e(meta.description)}">`,`<meta property="og:url" content="${e(meta.canonical)}">`,`<meta property="og:locale" content="${e(meta.og.locale)}">`,`<meta property="og:locale:alternate" content="${e(meta.og.alternateLocale)}">`);
  const image=meta.og.image;
  if(image) tags.push(`<meta property="og:image" content="${e(image.url)}">`,`<meta property="og:image:alt" content="${e(image.alt)}">`,`<meta property="og:image:width" content="${image.width}">`,`<meta property="og:image:height" content="${image.height}">`,`<meta property="og:image:type" content="${e(image.type)}">`);
  tags.push(`<meta name="twitter:card" content="${image?'summary_large_image':'summary'}">`,`<meta name="twitter:title" content="${e(meta.title)}">`,`<meta name="twitter:description" content="${e(meta.description)}">`);
  if(image) tags.push(`<meta name="twitter:image" content="${e(image.url)}">`,`<meta name="twitter:image:alt" content="${e(image.alt)}">`);
  for(const json of meta.jsonLd||[]) tags.push(`<script type="application/ld+json">${json}</script>`);
  return tags.join('');
}
