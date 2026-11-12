import { messages, topicNames, urlFor, creatorName } from './i18n.mjs';
import { safeExternalUrl } from './catalog.mjs';
import { siteUrl } from './site-config.mjs';

const available = work => work.editorial?.status==='published' && work.verification?.availability!=='unavailable';

export function listedWorks(page, catalog) {
  if(page.kind==='home'||page.kind==='explore') return catalog.gallery;
  if(page.kind==='type') return catalog.gallery.filter(work=>work.type===page.entityId);
  if(page.kind==='collection') {
    const collection=catalog.collections.find(x=>x.id===page.entityId);
    return (collection?.works||[]).map(id=>catalog.works.find(w=>w.id===id)).filter(w=>w&&available(w));
  }
  if(page.kind==='topic') return catalog.works.filter(work=>work.primary_category===page.entityId&&available(work));
  return [];
}

export function breadcrumbsFor(page, catalog) {
  const lang=page.locale, m=messages[lang], home={name:lang==='zh'?'首页':'Home',path:urlFor(lang,'/')};
  if(page.kind==='work') {
    const work=catalog.works.find(x=>x.id===page.entityId), type=catalog.types.find(x=>x.id===work?.type);
    return [home,...(type?[{name:type[lang],path:urlFor(lang,`/types/${type.id}/`)}]:[]),{name:work?.locales[lang].title||page.entityId,path:page.path}];
  }
  if(page.kind==='collection') {
    const item=catalog.collections.find(x=>x.id===page.entityId);
    return [home,{name:m.collections,path:urlFor(lang,'/collections/')},{name:item?.[lang]?.title||page.entityId,path:page.path}];
  }
  if(page.kind==='type') return [home,{name:catalog.types.find(x=>x.id===page.entityId)?.[lang]||page.entityId,path:page.path}];
  if(page.kind==='topic') return [home,{name:topicNames[page.entityId]?.[lang==='zh'?0:1]||page.entityId,path:page.path}];
  if(page.kind==='explore') return [home,{name:m.explore,path:page.path}];
  if(page.kind==='collectionIndex') return [home,{name:m.collections,path:page.path}];
  return [];
}

export function buildStructuredData(page, manifest, catalog) {
  const lang=page.locale, m=messages[lang], canonical=siteUrl(page.path), nodes=[];
  if(page.kind==='home') nodes.push({'@context':'https://schema.org','@type':'WebSite',name:'Freemy',url:siteUrl('/')});
  const crumbs=breadcrumbsFor(page,catalog);
  if(crumbs.length) nodes.push({'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:crumbs.map((item,index)=>({'@type':'ListItem',position:index+1,name:item.name,item:siteUrl(item.path)}))});
  if(page.kind==='work') {
    const work=catalog.works.find(x=>x.id===page.entityId), original=safeExternalUrl(work.demo_url);
    const creator=creatorName(work,lang);
    const creation={'@type':'CreativeWork',name:work.title_original,...(original?{url:original}:{}),...(creator?{creator:{name:creator}}:{})};
    nodes.push({'@context':'https://schema.org','@type':'WebPage',name:work.locales[lang].title,description:work.locales[lang].summary,url:canonical,mainEntity:creation});
  }
  if(['explore','type','collection','topic','collectionIndex'].includes(page.kind)) {
    let title=crumbs.at(-1)?.name||m.explore, links;
    if(page.kind==='collectionIndex') links=catalog.collections.map(c=>({name:c[lang].title,path:urlFor(lang,`/collections/${c.id}/`)}));
    else links=listedWorks(page,catalog).map(work=>({name:work.locales[lang].title,path:urlFor(lang,`/works/${work.slug}/`)}));
    nodes.push({'@context':'https://schema.org','@type':'CollectionPage',name:title,url:canonical,mainEntity:{'@type':'ItemList',itemListElement:links.map((item,index)=>({'@type':'ListItem',position:index+1,name:item.name,item:siteUrl(item.path)}))}});
  }
  return nodes;
}

export function serializeJsonLd(value) {
  return JSON.stringify(value).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
}
