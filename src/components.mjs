import { escapeHtml as e, safeExternalUrl, hasAiEvidence } from './catalog.mjs';
import { messages, urlFor, creatorName } from './i18n.mjs';
import { renderSeoHead } from './seo.mjs';

// Register filtering before Vercel's scripts load, including for pageviews.
function analyticsBootstrap(){return `<script>
window.va=window.va||function(){(window.vaq=window.vaq||[]).push(arguments)};
window.si=window.si||function(){(window.siq=window.siq||[]).push(arguments)};
window.__freemyAnalyticsMode='normal';
try {
  var u=new URL(location.href), requested=u.searchParams.get('freemy_analytics');
  if(['normal','off','qa'].includes(requested)){
    window.__freemyAnalyticsMode=requested;
    try {if(requested==='normal')sessionStorage.removeItem('freemy-analytics-mode');else sessionStorage.setItem('freemy-analytics-mode',requested);}catch{}
    u.searchParams.delete('freemy_analytics');history.replaceState(history.state,'',u.pathname+u.search+u.hash);
  } else window.__freemyAnalyticsMode=sessionStorage.getItem('freemy-analytics-mode')||'normal';
} catch {}
function freemyRedact(event){try{if(event.url){var u=new URL(event.url,location.origin);u.search='';u.hash='';return {...event,url:u.toString()}}return event}catch{return null}}
window.va('beforeSend',function(event){
  if(window.__freemyAnalyticsMode==='off')return null;
  if(window.__freemyAnalyticsMode==='qa'&&(event.type!=='event'||!event.payload?.data?.placement?.startsWith('qa:')))return null;
  return freemyRedact(event);
});
window.si('beforeSend',function(event){return window.__freemyAnalyticsMode==='normal'?freemyRedact(event):null});
</script>`;}

export function image(w,lang,{context='card',priority='lazy'}={}){
  const p=w.media?.poster, m=messages[lang];
  if(!p) return `<div class="no-preview">${e(m.noPreview)}</div>`;
  const sizes=[480,960,...(p.width>=1440?[1440]:[])];
  const srcset=sizes.map(size=>`/media/${p.base}-${size}.webp ${size}w`).join(', ');
  const sizeHint=context==='detail'?'(max-width: 900px) 100vw, (max-width: 1280px) 60vw, 760px':'(max-width: 650px) 100vw, (max-width: 1000px) 50vw, 33vw';
  const alt=p.alt?.[lang]||`${w.locales[lang].title} — ${lang==='zh'?'作品画面':'screenshot of the experience'}`;
  const loading=priority==='lcp'?'loading="eager" fetchpriority="high"':priority==='eager'?'loading="eager"':'loading="lazy"';
  return `<img src="${e(p.src)}" srcset="${e(srcset)}" sizes="${e(sizeHint)}" width="${p.width}" height="${p.height}" alt="${e(alt)}" ${loading} decoding="async">`;
}

export function card(w,lang,index=0,{context='card',priorityFirst=true}={}){
  const m=messages[lang], l=w.locales[lang], title=l.title, details=urlFor(lang,`/works/${w.slug}/`), creator=creatorName(w,lang);
  const data={id:w.id,type:w.type,title_original:w.title_original,creator:{name:creator},locales:{zh:{title:w.locales.zh.title,summary:w.locales.zh.summary},en:{title:w.locales.en.title,summary:w.locales.en.summary}},tags:w.tags||[],search_terms:w.search_terms||[],demo_url:w.demo_url,poster:w.media?.poster?.src||'',video:w.media?.video?.src||'',detail:details,added_at:w.added_at,sequence:w.catalog_order,order:w.editorial?.featured_order||999};
  return `<article class="creation-card" data-work="${e(JSON.stringify(data))}"><a href="${e(details)}" class="preview-link" data-preview aria-label="${e(m.preview)}: ${e(title)}">${image(w,lang,{context,priority:priorityFirst&&index===0?'lcp':'lazy'})}<span class="preview-hint">${e(m.preview)} <span aria-hidden="true">↗</span></span></a><div class="creation-copy"><div class="creation-heading"><h3><a href="${e(details)}" ${context==='related'?`data-track-event="related_click" data-track-work="${e(w.id)}" data-track-placement="related"`:''}>${e(title)}</a></h3><a class="open-link" data-track-event="experience_open" data-track-work="${e(w.id)}" data-track-placement="${e(context)}" href="${e(safeExternalUrl(w.demo_url))}" target="_blank" rel="noopener noreferrer" aria-label="${e(m.open)}: ${e(title)}">${e(m.open)} <span aria-hidden="true">↗</span></a></div><p>${e(l.summary)}</p><div class="creator-line">${e(m.by)} <strong>${e(creator||m.unknown)}</strong>${hasAiEvidence(w)?'':` <span class="reference-badge">${e(m.inspiration)}</span>`}</div></div></article>`;
}

export function typeTabs(types,lang,active=''){
  const m=messages[lang];
  return `<nav class="type-tabs" aria-label="${e(m.type)}"><a class="${!active?'active':''}" href="${e(urlFor(lang,'/explore/'))}">${e(m.all)}</a>${types.map(t=>`<a class="${active===t.id?'active':''}" href="${e(urlFor(lang,`/types/${t.id}/`))}">${e(t[lang])}</a>`).join('')}</nav>`;
}

export function galleryGrid(works,lang,options={}){return `<div class="gallery-grid" id="gallery-grid">${works.map((w,i)=>card(w,lang,i,options)).join('')}</div><div class="empty-results" id="empty-results" ${works.length?'hidden':''}>${e(messages[lang].empty)}</div>`;}

export function controls(lang, route='/explore/', fallback='hydraulics'){
  const m=messages[lang];
  return `<div class="gallery-controls"><form class="search-form" id="gallery-filter" action="${e(urlFor(lang,route))}" method="get" role="search"><label class="sr-only" for="gallery-search">${e(m.search)}</label><span aria-hidden="true">⌕</span><input id="gallery-search" name="q" type="search" placeholder="${e(m.search)}"><button class="sr-only" type="submit">${e(m.search)}</button></form><div class="gallery-actions"><label><span class="sr-only">${e(m.sort)}</span><select id="gallery-sort" aria-label="${e(m.sort)}"><option value="featured">${e(m.featured)}</option><option value="recent">${e(m.recent)}</option></select></label><a class="surprise" data-surprise href="${e(urlFor(lang,`/works/${fallback}/`))}">${e(m.random)} <span>↗</span></a></div></div>`;
}

export function previewDialog(lang){const m=messages[lang];return `<dialog id="preview-dialog" aria-labelledby="preview-title"><div class="dialog-head"><span>${e(m.preview)}</span><button type="button" class="dialog-close" aria-label="${e(m.close)}">×</button></div><div class="dialog-content"><div class="dialog-media"><img id="preview-image" alt=""><span id="preview-unavailable" class="image-error" hidden>${e(m.noPreview)}</span><video id="preview-video" controls playsinline preload="none" hidden></video></div><div class="dialog-copy"><h2 id="preview-title"></h2><p id="preview-summary"></p><p class="dialog-creator"><span>${e(m.by)}</span> <strong id="preview-creator"></strong></p><button type="button" id="preview-play" class="video-button" hidden>${lang==='zh'?'▶ 播放操作短片':'▶ Play demo clip'}</button><div class="dialog-actions"><a id="preview-open" class="button button-dark" data-track-event="experience_open" data-track-placement="dialog" target="_blank" rel="noopener noreferrer">${e(m.open)} ↗</a><a id="preview-details" class="button button-light">${e(m.details)} →</a></div><small>${e(m.onOriginal)}</small></div></div></dialog>`;}

export function collectionCard(c,lang,works,{priority='lazy'}={}){
  const m=messages[lang], available=works.filter(w=>c.works.includes(w.id)&&w.editorial?.status==='published'&&w.verification?.availability!=='unavailable'), cover=available.find(w=>w.id===c.cover)||available.find(w=>w.media?.poster);
  return `<a class="collection-card" data-track-event="collection_open" data-track-placement="collection-${e(c.id)}" href="${e(urlFor(lang,`/collections/${c.id}/`))}"><div class="collection-image">${cover?image(cover,lang,{context:'collection',priority}):`<div class="collection-fallback"><span>${e(m.inspiration)}</span><span>↗</span></div>`}</div><div><span class="collection-kicker">${available.length} ${e(m.collectionCount)}</span><h3>${e(c[lang].title)}</h3><p>${e(c[lang].summary)}</p><span class="collection-more">${e(m.more)} ↗</span></div></a>`;
}

export function layout({lang,path='/',body,seo}){
  const m=messages[lang];
  if(!seo) throw new Error(`Missing SEO metadata for ${path}`);
  return `<!doctype html><html lang="${e(m.lang)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#f7f7f2">${renderSeoHead(seo)}<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/assets/style.css">${analyticsBootstrap()}<script defer src="/_vercel/insights/script.js"></script><script defer src="/_vercel/speed-insights/script.js"></script><script type="module" src="/assets/app.mjs"></script></head><body data-lang="${lang}" data-page-type="${e(seo.pageType)}" data-analytics-enabled="${seo.analyticsEnabled?'true':'false'}" data-impressions-enabled="${seo.impressionsEnabled?'true':'false'}"><a class="skip-link" href="#main">${lang==='zh'?'跳至内容':'Skip to content'}</a><header class="site-header"><div class="wrap header-inner"><a class="brand" href="${e(urlFor(lang,'/'))}" aria-label="Freemy"><span class="brand-icon" aria-hidden="true"></span><span>freemy<span class="brand-dot">.</span></span></a><nav class="main-nav" aria-label="${lang==='zh'?'主导航':'Main navigation'}"><a href="${e(urlFor(lang,'/explore/'))}">${e(m.explore)}</a><a href="${e(urlFor(lang,'/collections/'))}">${e(m.collections)}</a></nav><div class="header-right"><div class="language-switch" aria-label="${lang==='zh'?'语言':'Language'}"><a href="${e(urlFor('zh',path))}" data-language-switch="zh" ${lang==='zh'?'aria-current="page"':''}>中文</a><span>/</span><a href="${e(urlFor('en',path))}" data-language-switch="en" ${lang==='en'?'aria-current="page"':''}>EN</a></div><a class="header-submit" href="${e(urlFor(lang,'/submit/'))}">${e(m.submit)} <span>↗</span></a></div></div></header><main id="main">${body}</main><footer class="site-footer"><div class="wrap footer-inner"><div><a class="brand" href="${e(urlFor(lang,'/'))}"><span class="brand-icon" aria-hidden="true"></span><span>freemy<span class="brand-dot">.</span></span></a><p>${e(m.footer)}</p></div><nav aria-label="${lang==='zh'?'页脚导航':'Footer'}"><a href="${e(urlFor(lang,'/explore/'))}">${e(m.explore)}</a><a href="${e(urlFor(lang,'/collections/'))}">${e(m.collections)}</a><a href="${e(urlFor(lang,'/about/'))}">${e(m.about)}</a><a href="${e(urlFor(lang,'/privacy/'))}">${e(m.privacy)}</a><a href="${e(urlFor(lang,'/submit/'))}">${e(m.submit)}</a></nav></div><div class="wrap footer-bottom"><span>© ${new Date().getUTCFullYear()} FREEMY</span><span>${e(m.footerNote)}</span></div></footer>${previewDialog(lang)}</body></html>`;
}
