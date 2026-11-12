import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const executablePath=process.env.FREEMY_BROWSER_PATH||'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browser=await chromium.launch({executablePath,headless:true});
try{
  for(const method of ['mouse','keyboard','touch','blocked']){
    const context=await browser.newContext(method==='touch'?{hasTouch:true,isMobile:true,viewport:{width:390,height:844}}:{viewport:{width:1440,height:900}});
    const page=await context.newPage();
    if(method!=='blocked')await page.addInitScript(()=>{
      window.__freemyTestEvents=[];
      window.va=(kind,event)=>{if(kind==='event')window.__freemyTestEvents.push(event);};window.si=()=>{};
    });
    await page.route('https://freemy.ai/**',async route=>{
      const url=new URL(route.request().url());
      if(url.pathname.startsWith('/_vercel/'))return method==='blocked'?route.abort():route.fulfill({status:204,body:''});
      if(url.pathname.startsWith('/media/')||url.pathname.startsWith('/og/'))return route.fulfill({status:204,body:''});
      const relative=url.pathname.endsWith('/')?`${url.pathname}index.html`:url.pathname,root=path.resolve('dist'),file=path.resolve(root,`.${relative}`);
      if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404,body:''});
      const contentType=file.endsWith('.html')?'text/html':file.endsWith('.mjs')?'text/javascript':file.endsWith('.css')?'text/css':'application/octet-stream';
      let body=fs.readFileSync(file);
      if(contentType==='text/html')body=Buffer.from(body.toString('utf8').replace('data-analytics-enabled="false"','data-analytics-enabled="true"'));
      return route.fulfill({status:200,contentType,body});
    });
    await page.goto('https://freemy.ai/',{waitUntil:'domcontentloaded'});
    const preview=page.locator('.creation-card [data-preview]').first();
    await preview.scrollIntoViewIfNeeded();
    if(method==='keyboard'){await preview.focus();await page.keyboard.press('Enter');}
    else if(method==='touch')await preview.tap();
    else await preview.click();
    assert.equal(await page.locator('#preview-dialog').evaluate(el=>el.open),true,`${method}: preview opens`);
    if(method==='blocked'){
      assert.match(await page.locator('#preview-open').getAttribute('href'),/^https:\/\//,'original link works without a statistics script');
      await context.close();continue;
    }
    const open=page.locator('#preview-open');
    await open.evaluate(el=>el.addEventListener('click',event=>event.preventDefault()));
    if(method==='keyboard'){await open.focus();await page.keyboard.press('Enter');}
    else if(method==='touch')await open.tap();
    else await open.click();
    const events=await page.evaluate(()=>window.__freemyTestEvents);
    assert.deepEqual(events.map(e=>e.name),['preview_open','experience_open'],`${method}: one event per action`);
    assert.equal(events[0].data.work_id,events[1].data.work_id,`${method}: preview and original link refer to the same work`);
    await context.close();
  }
  console.log('Analytics mouse, keyboard, touch and script-failure checks passed.');
}finally{await browser.close();}
