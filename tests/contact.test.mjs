import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog } from '../src/validate.mjs';
import { buildPageManifest } from '../src/page-manifest.mjs';
import { buildSeo } from '../src/seo.mjs';
import { renderSitemap } from '../src/sitemap.mjs';
import * as pagesModule from '../src/pages.mjs';
import { safeExternalUrl } from '../src/catalog.mjs';

const contact=await import('../src/contact.mjs').catch(error=>{
  if(error.code==='ERR_MODULE_NOT_FOUND')return {};
  throw error;
});
const c=loadCatalog(), manifest=buildPageManifest(c);

test('contact has bilingual canonical pages, alternates and sitemap entries',()=>{
  for(const [locale,path] of [['en','/en/contact/'],['zh','/contact/']]){
    const page=manifest.find(item=>item.kind==='contact'&&item.locale===locale);
    assert.ok(page,'contact page must be in manifest');assert.equal(page.path,path);assert.equal(page.indexable,true);
    const seo=buildSeo(page,manifest,c);
    assert.equal(seo.canonical,`https://freemy.ai${path}`);
    assert.equal(seo.alternates.en,'https://freemy.ai/en/contact/');
    assert.equal(seo.alternates['zh-Hans'],'https://freemy.ai/contact/');
    assert.notEqual(seo.title,'404 | Freemy');
    assert.equal(typeof pagesModule.contact,'function');
    const html=pagesModule.contact(locale,seo,page,c);
    assert.match(html,/ai@freemy\.ai/);assert.match(html,/data-contact-copy/);assert.match(html,/mailto:ai@freemy\.ai/);
    assert.ok(renderSitemap(manifest,c).includes(`https://freemy.ai${path}`));
  }
});

test('mailto has a fixed recipient and safely encodes a correction subject and body',()=>{
  assert.equal(typeof contact.buildMailto,'function');
  const work={id:'hydraulics',slug:'hydraulics',locales:{zh:{title:'液压 & 机械?\nBcc: victim@example.com'},en:{title:'Hydraulics & gears?'}}};
  const mail=new URL(contact.buildMailto({kind:'correction',locale:'zh',work}));
  assert.equal(mail.protocol,'mailto:');assert.equal(mail.pathname,'ai@freemy.ai');
  assert.equal(mail.searchParams.has('cc'),false);assert.equal(mail.searchParams.has('bcc'),false);
  assert.match(mail.searchParams.get('subject'),/hydraulics/);
  assert.match(mail.searchParams.get('body'),/https:\/\/freemy\.ai\/works\/hydraulics\//);
  assert.throws(()=>contact.buildMailto({kind:'correction',locale:'en',work:{...work,id:'a\nBcc:x'}}),/invalid/i);
  assert.throws(()=>contact.buildMailto({kind:'other',locale:'en'}),/invalid/i);
  assert.equal(safeExternalUrl('mailto:ai@freemy.ai'),null,'general external URL policy stays unchanged');
});

test('footer, about, submission and work pages expose the appropriate contact paths',()=>{
  const seoFor=key=>{const page=manifest.find(item=>item.key===key);return buildSeo(page,manifest,c);};
  const about=pagesModule.about('en',seoFor('about:en'));
  assert.match(about,/href="\/en\/contact\/"/);assert.match(about,/ai@freemy\.ai/);
  const submit=pagesModule.submit('zh',seoFor('submit:zh'));
  assert.match(submit,/github\.com\/freemyai\/website\/issues\/new/);assert.match(submit,/mailto:ai@freemy\.ai/);
  const page=manifest.find(item=>item.key==='work:hydraulics:en'),work=c.works.find(item=>item.id==='hydraulics');
  const detail=pagesModule.detail('en',c,work,buildSeo(page,manifest,c),page);
  assert.match(detail,/data-track-event="contact_click" data-track-work="hydraulics"/);
  assert.match(detail,/Creation%20correction/);
});
