import { siteUrl } from './site-config.mjs';

const reserved = new Set([
  'en','zh','works','explore','collections','types','categories','about','contact',
  'privacy','submit','api','admin','insights','assets','media','og','_vercel',
  '.well-known','404','robots.txt','sitemap.xml','feed','rss','search','w','s'
]);
const validSlug = value => typeof value==='string' && value.length<=80 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
const allowedKeys = new Set(['work_id','share_slug','previous_slugs','state']);
const normalized = value => String(value).replace(/\/+$/,'')||'/';

export function validateShareRegistry(catalog,registry,pageManifest){
  if(!Array.isArray(catalog?.works)||!Array.isArray(pageManifest)||registry?.version!==1||!Array.isArray(registry.entries))throw new Error('Invalid share registry');
  const works=new Map(catalog.works.map(work=>[work.id,work]));
  const occupied=new Set(pageManifest.map(page=>normalized(page.path)));
  const seenSlugs=new Map(), seenWorks=new Set(), activeWorks=new Set();
  for(const item of registry.entries){
    if(!item||Object.keys(item).some(key=>!allowedKeys.has(key))||typeof item.work_id!=='string'||!item.work_id||!['active','retired'].includes(item.state)||!Array.isArray(item.previous_slugs))throw new Error('Invalid share registry entry or field');
    if(seenWorks.has(item.work_id))throw new Error(`Duplicate share work: ${item.work_id}`);
    seenWorks.add(item.work_id);
    const work=works.get(item.work_id);
    if(item.state==='active'){
      if(!work||work.editorial?.status!=='published')throw new Error(`Unknown or unpublished share work: ${item.work_id}`);
      if(!validSlug(work.slug))throw new Error(`Invalid canonical slug: ${item.work_id}`);
      activeWorks.add(item.work_id);
    }
    for(const slug of [item.share_slug,...item.previous_slugs]){
      if(!validSlug(slug)||reserved.has(slug))throw new Error(`Invalid or reserved share alias: ${slug}`);
      if(seenSlugs.has(slug))throw new Error(`Duplicate share alias: ${slug}`);
      if(occupied.has(`/${slug}`)||occupied.has(`/zh/${slug}`))throw new Error(`Share alias conflicts with an existing page: ${slug}`);
      seenSlugs.set(slug,item.work_id);
    }
  }
  for(const work of catalog.works)if(work.editorial?.status==='published'&&!activeWorks.has(work.id))throw new Error(`Missing active share alias: ${work.id}`);
}

export function buildShareManifest(catalog,registry,pageManifest){
  validateShareRegistry(catalog,registry,pageManifest);
  const works=new Map(catalog.works.map(work=>[work.id,work]));
  return registry.entries.filter(item=>item.state==='active').sort((a,b)=>a.work_id.localeCompare(b.work_id,'en')).flatMap(item=>{
    const work=works.get(item.work_id);
    return ['en','zh'].map(locale=>({workId:item.work_id,locale,shareSlug:item.share_slug,previousSlugs:[...item.previous_slugs].sort(),
      sharePath:locale==='en'?`/${item.share_slug}/`:`/zh/${item.share_slug}/`,
      canonicalPath:`${locale==='en'?'/en':''}/works/${work.slug}/`}));
  });
}

export function shareUrlFor(entry){
  if(!entry||!['en','zh'].includes(entry.locale)||!validSlug(entry.shareSlug)||entry.sharePath!==(entry.locale==='en'?`/${entry.shareSlug}/`:`/zh/${entry.shareSlug}/`))throw new Error('Invalid share entry');
  return siteUrl(entry.sharePath);
}
