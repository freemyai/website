import fs from 'node:fs';
import path from 'node:path';
import { root, loadCatalog } from './validate.mjs';
import { buildPageManifest } from './page-manifest.mjs';
import { buildSeo } from './seo.mjs';
import { renderSitemap, renderRobots } from './sitemap.mjs';
import { home, explore, collectionsPage, collectionPage, detail, topicPage, about, privacy, submit, notFound, fallbackNotFound } from './pages.mjs';

const out=path.resolve(root,'dist');
if(out!==path.join(root,'dist')) throw new Error('Unexpected output directory');
const c=loadCatalog(), manifest=buildPageManifest(c);
fs.rmSync(out,{recursive:true,force:true});
fs.mkdirSync(path.join(out,'assets'),{recursive:true});
fs.mkdirSync(path.join(out,'media'),{recursive:true});
for(const name of ['style.css','app.mjs','analytics.mjs','favicon.svg']) fs.copyFileSync(path.join(root,'assets',name),path.join(out,'assets',name));
fs.copyFileSync(path.join(root,'src/catalog.mjs'),path.join(out,'assets/catalog.mjs'));
if(fs.existsSync(path.join(root,'assets/og'))) fs.cpSync(path.join(root,'assets/og'),path.join(out,'og'),{recursive:true});
for(const work of c.works.filter(w=>w.editorial?.status==='published'&&w.media?.poster)){
  const poster=work.media.poster;
  for(const size of [480,960,...(poster.width>=1440?[1440]:[])]){
    const filename=`${poster.base}-${size}.webp`, source=path.join(root,'assets/media',filename);
    if(!fs.existsSync(source)) throw new Error(`Missing media variant: ${filename}`);
    fs.copyFileSync(source,path.join(out,'media',filename));
  }
  if(work.media.video) fs.copyFileSync(path.join(root,'assets',work.media.video.src.slice(1)),path.join(out,work.media.video.src.slice(1)));
}

function render(page){
  const lang=page.locale, seo=buildSeo(page,manifest,c);
  switch(page.kind){
    case 'home': return home(lang,c,seo);
    case 'explore': return explore(lang,c,null,seo,page);
    case 'collectionIndex': return collectionsPage(lang,c,seo,page);
    case 'type': return explore(lang,c,c.types.find(x=>x.id===page.entityId),seo,page);
    case 'collection': return collectionPage(lang,c,c.collections.find(x=>x.id===page.entityId),seo,page);
    case 'work': return detail(lang,c,c.works.find(x=>x.id===page.entityId),seo,page);
    case 'topic': return topicPage(lang,c,c.taxonomy.categories.find(x=>x.id===page.entityId),seo,page);
    case 'about': return about(lang,seo);
    case 'privacy': return privacy(lang,seo);
    case 'submit': return submit(lang,seo);
    case 'notFound': return notFound(lang,seo);
    default: throw new Error(`Unknown page kind: ${page.kind}`);
  }
}
for(const page of manifest){
  const dest=path.resolve(out,`.${page.path}`,'index.html');
  if(!dest.startsWith(out+path.sep)) throw new Error(`Unsafe output path: ${page.path}`);
  fs.mkdirSync(path.dirname(dest),{recursive:true});
  fs.writeFileSync(dest,render(page));
}
const notFoundZh=manifest.find(page=>page.key==='notFound:zh');
fs.writeFileSync(path.join(out,'404.html'),fallbackNotFound(buildSeo(notFoundZh,manifest,c)));
fs.writeFileSync(path.join(out,'robots.txt'),renderRobots());
fs.writeFileSync(path.join(out,'sitemap.xml'),renderSitemap(manifest,c));
const report=path.join(root,'reports','seo');
fs.mkdirSync(report,{recursive:true});
fs.writeFileSync(path.join(report,'page-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(`Built ${manifest.length} bilingual pages (${manifest.filter(p=>p.indexable).length} indexable) and ${c.gallery.length} AI creation previews.`);
