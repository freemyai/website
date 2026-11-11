import fs from 'node:fs';
import path from 'node:path';
import { root, loadCatalog } from './validate.mjs';
import { urlFor } from './i18n.mjs';
import { home, explore, collectionsPage, collectionPage, detail, topicPage, about, privacy, submit, notFound } from './pages.mjs';

const out=path.resolve(root,'dist');
if(out!==path.join(root,'dist')) throw new Error('Unexpected output directory');
const c=loadCatalog();
fs.rmSync(out,{recursive:true,force:true});
fs.mkdirSync(path.join(out,'assets'),{recursive:true});
fs.mkdirSync(path.join(out,'media'),{recursive:true});
for(const name of ['style.css','app.mjs','favicon.svg']) fs.copyFileSync(path.join(root,'assets',name),path.join(out,'assets',name));
fs.copyFileSync(path.join(root,'src/catalog.mjs'),path.join(out,'assets/catalog.mjs'));
for(const work of c.works.filter(w=>w.editorial?.status==='published'&&w.media?.poster)){
  const poster=work.media.poster;
  for(const size of [480,960,...(poster.width>=1440?[1440]:[])]){
    const filename=`${poster.base}-${size}.webp`, source=path.join(root,'assets/media',filename);
    if(!fs.existsSync(source)) throw new Error(`Missing media variant: ${filename}`);
    fs.copyFileSync(source,path.join(out,'media',filename));
  }
  if(work.media.video) fs.copyFileSync(path.join(root,'assets',work.media.video.src.slice(1)),path.join(out,work.media.video.src.slice(1)));
}
const paths=[];
function write(lang,route,html){
  const url=urlFor(lang,route), dest=path.resolve(out,`.${url}`,'index.html');
  if(!dest.startsWith(out+path.sep)) throw new Error(`Unsafe output path: ${url}`);
  fs.mkdirSync(path.dirname(dest),{recursive:true}); fs.writeFileSync(dest,html); paths.push(url);
}
for(const lang of ['zh','en']){
  write(lang,'/',home(lang,c));
  write(lang,'/explore/',explore(lang,c));
  write(lang,'/collections/',collectionsPage(lang,c));
  write(lang,'/about/',about(lang));
  write(lang,'/privacy/',privacy(lang));
  write(lang,'/submit/',submit(lang));
  for(const type of c.types) write(lang,`/types/${type.id}/`,explore(lang,c,type));
  for(const item of c.collections) write(lang,`/collections/${item.id}/`,collectionPage(lang,c,item));
  for(const w of c.works.filter(w=>w.editorial.status==='published')) write(lang,`/works/${w.slug}/`,detail(lang,c,w));
  for(const topic of c.taxonomy.categories) write(lang,`/categories/${topic.id}/`,topicPage(lang,c,topic));
}
fs.writeFileSync(path.join(out,'404.html'),notFound('zh'));
fs.mkdirSync(path.join(out,'404'),{recursive:true});
fs.writeFileSync(path.join(out,'404','index.html'),notFound('zh'));
fs.mkdirSync(path.join(out,'en','404'),{recursive:true});
fs.writeFileSync(path.join(out,'en','404','index.html'),notFound('en'));
fs.writeFileSync(path.join(out,'robots.txt'),'User-agent: *\nAllow: /\nSitemap: https://freemy.ai/sitemap.xml\n');
fs.writeFileSync(path.join(out,'sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map(u=>`<url><loc>https://freemy.ai${u}</loc></url>`).join('')}</urlset>`);
console.log(`Built ${paths.length} bilingual pages and ${c.gallery.length} AI creation previews.`);
