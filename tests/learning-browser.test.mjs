import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright-core';
import { card, controls, previewDialog } from '../src/components.mjs';

const source={kind:'source',provider:'github',href:'https://github.com/simonw/tools/blob/main/tree-appreciator.html',label:'GitHub front-end source',ariaLabel:'GitHub source',external:true};
const note={kind:'learning_note',provider:'freemy',href:'/en/works/tree-appreciator/#learning',label:'Learning notes',ariaLabel:'Learning notes',external:false};
const base={id:'tree-appreciator',slug:'tree-appreciator',type:'games',title_original:'Tree Appreciator',demo_url:'https://example.org/tree',creator:{name:'Creator'},locales:{en:{title:'Tree Appreciator',summary:'Trees'},zh:{title:'树',summary:'树'}},media:{poster:{src:'/media/tree-960.webp',base:'tree',width:960,height:600}},ai_provenance:{status:'author_claimed',usage:'coding',evidence_url:'https://example.org/creator'},editorial:{status:'published',featured_order:1},added_at:'2026-11-16',hasOpenSource:true,hasLearningNote:true,learningPublic:{en:{actions:[source,note]}}};
const plain={...base,id:'plain',slug:'plain',title_original:'Plain',locales:{en:{title:'Plain',summary:'Plain'},zh:{title:'普通',summary:'普通'}},hasOpenSource:false,hasLearningNote:false,learningPublic:{en:{actions:[]}}};
const html=`<!doctype html><html lang="en"><body data-lang="en" data-page-type="home" data-analytics-enabled="true" data-impressions-enabled="false">${controls('en')}<div id="gallery-grid">${card(base,'en')}${card(plain,'en',1)}</div><div id="empty-results" hidden></div>${previewDialog('en')}<script type="module" src="/assets/app.mjs"></script></body></html>`;
const browserPath=process.env.FREEMY_BROWSER_PATH||'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

test('preview actions are replaced between works and filters match the card flags',async()=>{
  const browser=await chromium.launch({executablePath:browserPath,headless:true});
  try {
    const page=await browser.newPage({viewport:{width:1440,height:900}});
    await page.route('https://freemy.ai/**',route=>{
      const url=new URL(route.request().url());
      if(url.pathname==='/')return route.fulfill({status:200,contentType:'text/html',body:html});
      const file={'/assets/app.mjs':'assets/app.mjs','/assets/analytics.mjs':'assets/analytics.mjs','/assets/catalog.mjs':'src/catalog.mjs'}[url.pathname];
      if(file)return route.fulfill({status:200,contentType:'text/javascript',body:fs.readFileSync(file)});
      return route.fulfill({status:204,body:''});
    });
    await page.goto('https://freemy.ai/',{waitUntil:'networkidle'});
    const cards=page.locator('.creation-card');
    await cards.nth(0).locator('[data-preview]').click();
    assert.equal(await page.locator('#preview-learning-actions a').count(),2);
    assert.equal(await page.locator('#preview-learning-actions a').first().getAttribute('href'),source.href);
    await page.locator('.dialog-close').click();
    await cards.nth(1).locator('[data-preview]').click();
    assert.equal(await page.locator('#preview-learning-actions a').count(),0,'previous work links are removed');
    assert.equal(await page.locator('#preview-learning-actions').isVisible(),false);
    await page.locator('.dialog-close').click();
    await page.locator('#filter-open-source').check();
    assert.equal(await cards.nth(0).isVisible(),true);assert.equal(await cards.nth(1).isVisible(),false);
    await page.locator('#filter-open-source').uncheck();
    assert.equal(await cards.nth(1).isVisible(),true);
    await page.locator('#filter-learning-note').check();
    assert.equal(await cards.nth(1).isVisible(),false);
  } finally {await browser.close();}
});

test('source and learning clicks each emit one distinct event without opening preview',async()=>{
  const browser=await chromium.launch({executablePath:browserPath,headless:true});
  try {
    for(const method of ['mouse','keyboard','touch']) {
      const context=await browser.newContext(method==='touch'?{hasTouch:true,isMobile:true,viewport:{width:390,height:844}}:{});
      const page=await context.newPage();
      await page.addInitScript(()=>{window.__freemyTestEvents=[];window.va=(kind,event)=>{if(kind==='event')window.__freemyTestEvents.push(event);};});
      await page.route('https://freemy.ai/**',route=>{
        const url=new URL(route.request().url());if(url.pathname==='/')return route.fulfill({status:200,contentType:'text/html',body:html});
        const file={'/assets/app.mjs':'assets/app.mjs','/assets/analytics.mjs':'assets/analytics.mjs','/assets/catalog.mjs':'src/catalog.mjs'}[url.pathname];
        return file?route.fulfill({status:200,contentType:'text/javascript',body:fs.readFileSync(file)}):route.fulfill({status:204,body:''});
      });
      await page.goto('https://freemy.ai/',{waitUntil:'networkidle'});
      for(const action of await page.locator('.creation-card').first().locator('.resource-action').all()) {
        await action.evaluate(el=>el.addEventListener('click',event=>event.preventDefault()));
        if(method==='keyboard'){await action.focus();await page.keyboard.press('Enter');}else if(method==='touch')await action.tap();else await action.click();
      }
      const events=await page.evaluate(()=>window.__freemyTestEvents);
      assert.deepEqual(events.map(event=>event.name),['source_open','learning_open'],method);
      assert.equal(await page.locator('#preview-dialog').evaluate(el=>el.open),false);
      await context.close();
    }
  } finally {await browser.close();}
});
