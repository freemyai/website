import test from 'node:test';
import assert from 'node:assert/strict';

const audit=await import('../scripts/check-share-links.mjs').catch(error=>{
  if(error.code==='ERR_MODULE_NOT_FOUND')return {};
  throw error;
});
const entry={workId:'hydraulics',locale:'en',sharePath:'/hydraulics/',canonicalPath:'/en/works/hydraulics/'};
const work={id:'hydraulics',slug:'hydraulics',media:{poster:{src:'/media/hydraulics-960.webp'}}};
const html=`<!doctype html><html><head><title>Hydraulics | Freemy</title><link rel="canonical" href="https://freemy.ai/en/works/hydraulics/"><meta property="og:url" content="https://freemy.ai/en/works/hydraulics/"><meta property="og:title" content="Hydraulics | Freemy"><meta property="og:description" content="Explore hydraulics."><meta property="og:image" content="https://freemy.ai/og/work-hydraulics.jpg"></head><body><div data-share-control data-share-placement="detail" data-share-payload='{"workId":"hydraulics","shareUrlEn":"https://freemy.ai/hydraulics/","shareUrlZh":"https://freemy.ai/zh/hydraulics/"}'></div></body></html>`;
const seo={title:'Hydraulics | Freemy',description:'Explore hydraulics.',canonical:'https://freemy.ai/en/works/hydraulics/'};

test('share audit verifies canonical, localized social card and corresponding work payload',()=>{
  assert.equal(typeof audit.auditShareRecord,'function','share auditor must exist');
  assert.deepEqual(audit.auditShareRecord({entry,work,html,seo,imageExists:()=>true,sitemap:'<urlset></urlset>'}),[]);
  const wrong=html.replace('/og/work-hydraulics.jpg','/og/work-some-other-work.jpg');
  assert.ok(audit.auditShareRecord({entry,work,html:wrong,seo,imageExists:()=>true,sitemap:''}).some(x=>/image/i.test(x)));
  const wrongPayload=html.replace('"workId":"hydraulics"','"workId":"other"');
  assert.ok(audit.auditShareRecord({entry,work,html:wrongPayload,seo,imageExists:()=>true,sitemap:''}).some(x=>/payload/i.test(x)));
  assert.ok(audit.auditShareRecord({entry,work,html,seo,imageExists:()=>true,sitemap:'<loc>https://freemy.ai/hydraulics/</loc>'}).some(x=>/sitemap/i.test(x)));
});
