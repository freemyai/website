import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { eligibleForGallery, safeExternalUrl } from './catalog.mjs';
import { topicNames } from './i18n.mjs';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = name => JSON.parse(fs.readFileSync(path.join(root, 'data', name), 'utf8'));

export function loadCatalog() {
  const taxonomy=read('taxonomy.json'), oldWorks=read('works.json'), featured=read('gallery.json'), references=read('references.json');
  const translations=read('legacy-locales.json'), types=read('types.json'), collections=read('collections.json');
  for(const item of [...types,...collections,...taxonomy.categories]) if(!/^[a-z0-9-]+$/.test(item.id)) throw new Error(`Invalid route id: ${item.id}`);
  const imported=[...featured,...references], overrides=new Map(imported.map(w=>[w.id,w]));
  const works=oldWorks.map(w=>{
    const t=translations[w.id];
    if (!t) throw new Error(`Missing legacy translation: ${w.id}`);
    const zh={title:t.zhTitle,summary:w.summary_zh,action:w.first_action_zh,why:w.reason_zh,limit:w.quality?.limitations_zh};
    const base={...w,type:({physics:'experiments',engineering:'learning',electronics:'learning',robotics:'experiments'})[w.primary_category] || 'apps',locales:{zh,en:t.en},ai_provenance:{status:'unknown',usage:'unknown',evidence_url:null}};
    return overrides.has(w.id) ? {...base,...overrides.get(w.id)} : base;
  });
  for(const w of imported) if(!oldWorks.some(old=>old.id===w.id)) works.push(w);
  const ids=new Set(), slugs=new Set();
  for(const [index,w] of works.entries()){
    const category=taxonomy.categories.find(c=>c.id===w.primary_category);
    if(!w.id||ids.has(w.id)||!/^[a-z0-9-]+$/.test(w.slug)||slugs.has(w.slug)) throw new Error(`Invalid or duplicate id/slug: ${w.id}`);
    if(!category||!category.subcategories.some(s=>s.id===w.subcategory)) throw new Error(`Invalid topic: ${w.id}`);
    if(!types.some(t=>t.id===w.type)||!safeExternalUrl(w.demo_url)) throw new Error(`Invalid type or experience URL: ${w.id}`);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(w.added_at||'')) throw new Error(`Missing or invalid added date: ${w.id}`);
    for(const lang of ['zh','en']) for(const key of ['title','summary','action','why','limit']) if(!w.locales?.[lang]?.[key]) throw new Error(`Missing ${lang}.${key}: ${w.id}`);
    if(!['candidate','needs_review','published','unavailable','rejected'].includes(w.editorial?.status)) throw new Error(`Invalid editorial status: ${w.id}`);
    const type=types.find(t=>t.id===w.type), subcategory=category.subcategories.find(s=>s.id===w.subcategory);
    w.search_terms=[...(topicNames[category.id]||[]),subcategory.name_zh,subcategory.id.replaceAll('-',' '),type.zh,type.en];
    w.catalog_order=index;
    ids.add(w.id); slugs.add(w.slug);
  }
  for(const item of imported){
    const w=works.find(x=>x.id===item.id);
    const unavailable=w.verification?.availability==='unavailable';
    if(unavailable&&!w.media?.poster) continue;
    if(featured.some(f=>f.id===item.id)&&!unavailable&&!eligibleForGallery(w)) throw new Error(`Featured work lacks AI evidence, preview or translations: ${item.id}`);
    if(!w.media?.poster) continue;
    const poster=w.media.poster;
    if(!/^[a-z0-9-]+$/.test(poster.base)||poster.src!==`/media/${poster.base}-960.webp`||!Number.isInteger(poster.width)||!Number.isInteger(poster.height)) throw new Error(`Invalid preview: ${item.id}`);
    if(!fs.existsSync(path.join(root,'assets',poster.src.slice(1)))) throw new Error(`Missing preview file: ${item.id}`);
    if(!w.creator?.name||!safeExternalUrl(w.media.provenance?.source_url)||!/^\d{4}-\d{2}-\d{2}$/.test(w.media.provenance?.captured_at||'')) throw new Error(`Missing creator or capture details: ${item.id}`);
    if(w.media.video && (!/^\/media\/[a-z0-9-]+\.mp4$/.test(w.media.video.src)||!fs.existsSync(path.join(root,'assets',w.media.video.src.slice(1))))) throw new Error(`Invalid preview video: ${item.id}`);
  }
  for(const c of collections){
    if(!c.works.length||c.works.some(id=>!ids.has(id))||!c.zh?.title||!c.en?.title) throw new Error(`Invalid collection: ${c.id}`);
  }
  return {taxonomy,works,types,collections,gallery:works.filter(eligibleForGallery).sort((a,b)=>(a.editorial.featured_order||999)-(b.editorial.featured_order||999))};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  const c=loadCatalog(); console.log(`Validated ${c.works.length} works, ${c.gallery.length} gallery previews, ${c.types.length} types and ${c.collections.length} collections.`);
}
