import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// All traffic is fulfilled from the local build; no measurements leave this browser.
const executablePath=process.env.FREEMY_BROWSER_PATH||'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browser=await chromium.launch({executablePath,headless:true});
const page=await browser.newPage({viewport:{width:1440,height:900}});
try{
  await page.addInitScript(()=>{
    window.__freemyTestEvents=[];
    window.va=(kind,event)=>{if(kind==='event')window.__freemyTestEvents.push(event);};
    window.si=()=>{};
    window.__testVisible=true;
    Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>window.__testVisible?'visible':'hidden'});
  });
  await page.route('https://freemy.ai/**',async route=>{
    const url=new URL(route.request().url());
    if(url.pathname.startsWith('/_vercel/')||url.pathname.startsWith('/media/')||url.pathname.startsWith('/og/'))return route.fulfill({status:204,body:''});
    const relative=url.pathname.endsWith('/')?`${url.pathname}index.html`:url.pathname;
    const root=path.resolve('dist'), file=path.resolve(root,`.${relative}`);
    if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404,body:''});
    const contentType=file.endsWith('.html')?'text/html':file.endsWith('.mjs')?'text/javascript':file.endsWith('.css')?'text/css':'application/octet-stream';
    let body=fs.readFileSync(file);
    if(contentType==='text/html')body=Buffer.from(body.toString('utf8').replace('data-analytics-enabled="false"','data-analytics-enabled="true"').replace('data-impressions-enabled="false"','data-impressions-enabled="true"'));
    return route.fulfill({status:200,contentType,body});
  });
  const impressions=()=>page.evaluate(()=>window.__freemyTestEvents.filter(e=>e.name==='work_impression'));
  await page.goto('https://freemy.ai/?q=no-such-creation-xyz',{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(1300);
  assert.deepEqual(await impressions(),[],'search-hidden cards and offscreen cards are not recorded');
  await page.locator('#gallery-search').fill('');
  const first=page.locator('.creation-card [data-preview]').first();
  const firstId=await first.locator('..').evaluate(card=>JSON.parse(card.dataset.work).id);
  await first.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1400);
  assert.equal((await impressions()).filter(e=>e.data.work_id===firstId).length,1,'a visible preview is counted after one second');
  await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
  await first.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1400);
  assert.equal((await impressions()).filter(e=>e.data.work_id===firstId).length,1,'repeated scrolling does not count the same work again');
  await page.goto('https://freemy.ai/',{waitUntil:'domcontentloaded'});
  await page.evaluate(()=>{window.__testVisible=false;document.dispatchEvent(new Event('visibilitychange'));});
  await page.waitForTimeout(1300);
  assert.deepEqual(await impressions(),[],'a background tab records no exposures');
  await page.evaluate(()=>{window.__testVisible=true;document.dispatchEvent(new Event('visibilitychange'));});
  await page.waitForTimeout(1400);
  assert.ok((await impressions()).length>0,'a fresh full second in the foreground can count');
  console.log('Browser exposure checks passed.');
}finally{await browser.close();}
