import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parse } from 'parse5';
import { loadCatalog,root } from '../src/validate.mjs';
import { siteUrl } from '../src/site-config.mjs';
import { buildPageManifest } from '../src/page-manifest.mjs';
import { buildSeo } from '../src/seo.mjs';
import { checkShareRoutes } from './sync-share-routes.mjs';

const attrs=node=>Object.fromEntries((node?.attrs||[]).map(item=>[item.name,item.value]));
function allNodes(node){return [node,...(node.childNodes||[]).flatMap(allNodes)];}

export function auditShareRecord({entry,work,html,seo,imageExists,sitemap}){
  const issues=[],nodes=allNodes(parse(html));
  const tags=nodes.filter(n=>n.tagName==='meta').map(attrs);
  const meta=property=>tags.find(a=>a.property===property)?.content;
  const canonical=nodes.filter(n=>n.tagName==='link'&&attrs(n).rel==='canonical').map(n=>attrs(n).href);
  if(canonical.length!==1||canonical[0]!==seo.canonical||meta('og:url')!==seo.canonical)issues.push('canonical or og:url mismatch');
  if(meta('og:title')!==seo.title||meta('og:description')!==seo.description)issues.push('localized social title or description mismatch');
  const allowed=work.media?.poster?[siteUrl(`/og/work-${work.slug}.jpg`),siteUrl(work.media.poster.src)]:[siteUrl('/og/fallback.jpg')];
  const image=meta('og:image');
  if(!allowed.includes(image))issues.push('image does not belong to this work');
  else if(!imageExists(new URL(image).pathname))issues.push('image file is missing');
  const control=nodes.find(n=>attrs(n)['data-share-placement']==='detail');
  let payload;try{payload=JSON.parse(attrs(control)['data-share-payload']);}catch{}
  const key=entry.locale==='zh'?'shareUrlZh':'shareUrlEn';
  if(payload?.workId!==work.id||payload?.[key]!==siteUrl(entry.sharePath))issues.push('share payload mismatch');
  if(String(sitemap).includes(`<loc>${siteUrl(entry.sharePath)}</loc>`))issues.push('share alias must not enter sitemap');
  return issues;
}

export function auditShareBuild(){
  checkShareRoutes();
  const c=loadCatalog(),pages=buildPageManifest(c),dist=path.join(root,'dist'),errors=[];
  const sitemap=fs.readFileSync(path.join(dist,'sitemap.xml'),'utf8');
  for(const entry of c.shareManifest){
    const work=c.works.find(w=>w.id===entry.workId),page=pages.find(p=>p.kind==='work'&&p.entityId===entry.workId&&p.locale===entry.locale);
    const file=path.join(dist,`.${entry.canonicalPath}`,'index.html');
    if(!fs.existsSync(file)){errors.push(`${entry.workId}:${entry.locale}: missing detail page`);continue;}
    const html=fs.readFileSync(file,'utf8'),seo=buildSeo(page,pages,c);
    const imageExists=url=>fs.existsSync(path.join(dist,`.${url}`));
    for(const error of auditShareRecord({entry,work,html,seo,imageExists,sitemap}))errors.push(`${entry.workId}:${entry.locale}: ${error}`);
  }
  for(const file of ['assets/app.mjs','assets/share.mjs','assets/share-qr.mjs','assets/navigation-state.mjs','assets/vendor/qrcode-generator-2.0.4.mjs'])if(!fs.existsSync(path.join(dist,file)))errors.push(`Missing browser module: ${file}`);
  if(fs.existsSync(path.join(dist,'reports','share')))errors.push('Internal share index was copied to public output');
  const report={checked:c.shareManifest.length,errors};
  const dir=path.join(root,'reports','share');fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'share-audit.json'),JSON.stringify(report,null,2)+'\n');
  return report;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  const result=auditShareBuild();
  if(result.errors.length){console.error(`Share audit failed: ${result.errors.length} issues\n${result.errors.slice(0,30).join('\n')}`);process.exitCode=1;}
  else console.log(`Share audit PASS: ${result.checked} localized work pages, 0 errors. Report: reports/share/share-audit.json`);
}
