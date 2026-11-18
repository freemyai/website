import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog } from '../src/validate.mjs';
import { buildPageManifest } from '../src/page-manifest.mjs';
import { buildSeo } from '../src/seo.mjs';
import { home } from '../src/pages.mjs';

const mod=await import('../assets/navigation-state.mjs').catch(error=>{
  if(error.code==='ERR_MODULE_NOT_FOUND')return {};
  throw error;
});
const storage=()=>{
  const map=new Map();return {getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,value),removeItem:key=>map.delete(key)};
};

test('filter URL preserves unrelated parameters and stores only a valid recent sort',()=>{
  assert.equal(typeof mod.filterUrl,'function','filter URL helper must exist');
  const url=mod.filterUrl('https://freemy.ai/zh/?campaign=keep#gallery',{q:'robot',openSource:true,learningNote:false,sort:'recent'});
  assert.equal(url.searchParams.get('q'),'robot');assert.equal(url.searchParams.get('sort'),'recent');
  assert.equal(url.searchParams.get('open_source'),'1');assert.equal(url.searchParams.get('campaign'),'keep');assert.equal(url.hash,'#gallery');
  const reset=mod.filterUrl(url.href,{q:'',openSource:false,learningNote:false,sort:'invalid'});
  assert.equal(reset.searchParams.has('q'),false);assert.equal(reset.searchParams.has('sort'),false);assert.equal(reset.searchParams.has('open_source'),false);
  assert.equal(mod.sortFromSearch('?sort=recent'),'recent');assert.equal(mod.sortFromSearch('?sort=invalid'),'featured');
});

test('list position is temporary, scoped to the same listing and tolerant of disabled storage',()=>{
  assert.equal(typeof mod.saveListScroll,'function');
  const store=storage(),url='https://freemy.ai/en/explore/?q=robot&sort=recent';
  mod.saveListScroll(store,url,'https://freemy.ai',420,1000);
  assert.equal(mod.takeListScroll(store,'https://freemy.ai/en/explore/?q=other','https://freemy.ai',1100),null);
  assert.equal(mod.takeListScroll(store,url,'https://freemy.ai',1100),420);
  assert.equal(mod.takeListScroll(store,url,'https://freemy.ai',1101),null,'restore is consumed');
  mod.saveListScroll(store,url,'https://freemy.ai',420,1000);
  assert.equal(mod.takeListScroll(store,url,'https://freemy.ai',1000+31*60*1000),null);
  assert.equal(mod.saveListScroll(store,'https://evil.example/en/explore/','https://freemy.ai',10,1000),false);
  assert.equal(mod.saveListScroll(store,'https://freemy.ai/api/insights/','https://freemy.ai',10,1000),false);
  const disabled={getItem(){throw Error('disabled');},setItem(){throw Error('disabled');}};
  assert.equal(mod.saveListScroll(disabled,url,'https://freemy.ai',10,1000),false);
  assert.equal(mod.takeListScroll(disabled,url,'https://freemy.ai',1000),null);
});

test('homepage uses an explicit, validated selection of varied featured collections',()=>{
  const c=loadCatalog(),manifest=buildPageManifest(c),page=manifest.find(x=>x.key==='home:en');
  assert.deepEqual(c.homeFeaturedCollections,['machines-in-motion','little-games','sound-lab']);
  const html=home('en',c,buildSeo(page,manifest,c));
  for(const id of c.homeFeaturedCollections)assert.match(html,new RegExp(`/en/collections/${id}/`));
});
