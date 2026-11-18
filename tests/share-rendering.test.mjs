import test from 'node:test';
import assert from 'node:assert/strict';
import { parseFragment } from 'parse5';
import { loadCatalog } from '../src/validate.mjs';
import { buildPageManifest } from '../src/page-manifest.mjs';
import { buildSeo } from '../src/seo.mjs';
import { card, previewDialog } from '../src/components.mjs';
import { detail } from '../src/pages.mjs';

function nodes(root,predicate){
  return [root,...(root.childNodes||[]).flatMap(child=>nodes(child,predicate))].filter(predicate);
}
const attr=(node,name)=>(node.attrs||[]).find(x=>x.name===name)?.value;

test('cards have an independent share button with the selected work and bilingual URLs',()=>{
  const work=loadCatalog().works.find(w=>w.id==='hydraulics');
  const tree=parseFragment(card(work,'zh'));
  const controls=nodes(tree,n=>attr(n,'data-share-control')!==undefined);
  assert.equal(controls.length,1);
  const button=nodes(controls[0],n=>n.tagName==='button'&&attr(n,'data-share-toggle')!==undefined)[0];
  assert.ok(button,'independent share button exists');
  const insideAnchor=nodes(tree,n=>n.tagName==='a').some(a=>nodes(a,n=>n===button).length>0);
  assert.equal(insideAnchor,false);
  const payload=JSON.parse(attr(controls[0],'data-share-payload'));
  assert.equal(payload.workId,'hydraulics');
  assert.equal(payload.shareUrlZh,'https://freemy.ai/zh/hydraulics/');
  assert.equal(payload.shareUrlEn,'https://freemy.ai/hydraulics/');
  assert.equal(nodes(controls[0],n=>attr(n,'data-share-qr')!==undefined).length,1,'QR opens on request');
  assert.equal(nodes(controls[0],n=>attr(n,'data-qr-locale')!==undefined).length,2,'QR offers both languages');
});

test('preview and details provide sharing without replacing the original experience',()=>{
  const c=loadCatalog(), w=c.works.find(x=>x.id==='hydraulics'), pages=buildPageManifest(c);
  const page=pages.find(x=>x.key==='work:hydraulics:en');
  const html=detail('en',c,w,buildSeo(page,pages,c),page);
  assert.match(html,/data-share-placement="detail"/);
  assert.match(html,/<noscript>[\s\S]*https:\/\/freemy\.ai\/hydraulics\//);
  assert.match(html,/class="button button-dark detail-open"/);
  assert.match(previewDialog('en'),/data-share-placement="dialog"/);
});
