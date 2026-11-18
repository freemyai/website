import fs from 'node:fs';
import path from 'node:path';
import { buildPageManifest } from './page-manifest.mjs';
import { buildShareManifest, shareUrlFor } from './share-links.mjs';

export function loadShareManifest(catalog,root){
  const registry=JSON.parse(fs.readFileSync(path.join(root,'data','share-aliases.json'),'utf8'));
  return buildShareManifest(catalog,registry,buildPageManifest(catalog));
}

export function attachShareUrls(catalog,manifest){
  const works=new Map(catalog.works.map(work=>[work.id,work]));
  for(const entry of manifest){
    const work=works.get(entry.workId);
    work.shareUrls??={};
    work.shareUrls[entry.locale]=shareUrlFor(entry);
  }
  catalog.shareManifest=manifest;
  return catalog;
}
