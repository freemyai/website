import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { siteUrl } from '../src/site-config.mjs';
import { loadCatalog,root } from '../src/validate.mjs';

export function exportShareIndex(catalog,manifest){
  const works=new Map(catalog.works.filter(work=>work.editorial?.status==='published').map(work=>[work.id,work]));
  return manifest.filter(entry=>works.has(entry.workId)).map(entry=>{
    const work=works.get(entry.workId);
    return {work_id:work.id,title:work.locales[entry.locale].title,creator:work.creator?.name||'',locale:entry.locale,
      share_url:siteUrl(entry.sharePath),canonical_url:siteUrl(entry.canonicalPath),demo_url:work.demo_url,
      preview_url:work.media?.poster?.src?siteUrl(work.media.poster.src):null};
  });
}

export function writeShareIndex(catalog,base=root){
  const rows=exportShareIndex(catalog,catalog.shareManifest),dir=path.join(base,'reports','share');
  fs.mkdirSync(dir,{recursive:true});
  fs.writeFileSync(path.join(dir,'share-index.json'),JSON.stringify(rows,null,2)+'\n');
  const columns=['work_id','locale','title','creator','share_url','canonical_url','demo_url','preview_url'];
  const cell=value=>String(value??'').replace(/[\r\n]+/g,' ').replaceAll('|','\\|');
  const table=[`| ${columns.join(' | ')} |`,`| ${columns.map(()=>'---').join(' | ')} |`,...rows.map(row=>`| ${columns.map(col=>cell(row[col])).join(' | ')} |`)].join('\n');
  fs.writeFileSync(path.join(dir,'share-index.md'),`# Freemy share index\n\n${table}\n`);
  return rows.length;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)console.log(`Exported ${writeShareIndex(loadCatalog())} public language records to reports/share/.`);
