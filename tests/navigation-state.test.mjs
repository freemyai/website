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

test('filter URL preserves unrelated parameters and stores only a valid recent sort',()=>{
  assert.equal(typeof mod.filterUrl,'function','filter URL helper must exist');
  const url=mod.filterUrl('https://freemy.ai/zh/?campaign=keep#gallery',{q:'robot',openSource:true,learningNote:false,sort:'recent'});
  assert.equal(url.searchParams.get('q'),'robot');assert.equal(url.searchParams.get('sort'),'recent');
  assert.equal(url.searchParams.get('open_source'),'1');assert.equal(url.searchParams.get('campaign'),'keep');assert.equal(url.hash,'#gallery');
  const reset=mod.filterUrl(url.href,{q:'',openSource:false,learningNote:false,sort:'invalid'});
  assert.equal(reset.searchParams.has('q'),false);assert.equal(reset.searchParams.has('sort'),false);assert.equal(reset.searchParams.has('open_source'),false);
  assert.equal(mod.sortFromSearch('?sort=recent'),'recent');assert.equal(mod.sortFromSearch('?sort=invalid'),'featured');
});

test('each history entry retains its own temporary position and existing state',()=>{
  assert.equal(typeof mod.withListScroll,'function');
  const url='https://freemy.ai/en/explore/?q=robot&sort=recent',original={existing:'keep'};
  const a=mod.withListScroll(original,url,'https://freemy.ai',420,1000);
  const b=mod.withListScroll(original,url,'https://freemy.ai',840,1000);
  assert.equal(a.existing,'keep');assert.deepEqual(original,{existing:'keep'});
  assert.equal(mod.readListScroll(a,'https://freemy.ai/en/explore/?q=other','https://freemy.ai',1100),null);
  assert.equal(mod.readListScroll(a,url,'https://freemy.ai',1100),420);
  assert.equal(mod.readListScroll(b,url,'https://freemy.ai',1100),840);
  assert.equal(mod.readListScroll(a,url,'https://freemy.ai',1000+31*60*1000),null);
  assert.equal(mod.withListScroll(null,'https://evil.example/en/explore/','https://freemy.ai',10,1000),null);
  assert.equal(mod.withListScroll(null,'https://freemy.ai/api/insights/','https://freemy.ai',10,1000),null);
  assert.equal(mod.withListScroll('foreign-state',url,'https://freemy.ai',10,1000),null,'non-object state remains untouched');
});

test('homepage uses an explicit, validated selection of varied featured collections',()=>{
  const c=loadCatalog(),manifest=buildPageManifest(c),page=manifest.find(x=>x.key==='home:en');
  assert.deepEqual(c.homeFeaturedCollections,['machines-in-motion','little-games','sound-lab']);
  const html=home('en',c,buildSeo(page,manifest,c));
  for(const id of c.homeFeaturedCollections)assert.match(html,new RegExp(`/en/collections/${id}/`));
});
