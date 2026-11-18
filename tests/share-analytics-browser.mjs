import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const executablePath=process.env.FREEMY_BROWSER_PATH||'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browser=await chromium.launch({executablePath,headless:true});
const root=path.resolve('dist');
async function setup({mode='qa',denied=false,blocked=false}={}){
  const context=await browser.newContext({viewport:{width:1440,height:900}}),page=await context.newPage();
  await page.addInitScript(({denied})=>{
    window.__events=[];window.va=(kind,event)=>{if(kind==='event')window.__events.push(event);};window.si=()=>{};
    Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{if(denied)throw new Error('denied');}}});
    Object.defineProperty(navigator,'share',{configurable:true,value:async()=>{throw Object.assign(new Error('cancelled'),{name:'AbortError'});}});
  },{denied});
  await page.route('https://freemy.ai/**',async route=>{
    const url=new URL(route.request().url());
    if(url.pathname.startsWith('/_vercel/'))return blocked?route.abort():route.fulfill({status:204,body:''});
    const rel=url.pathname.endsWith('/')?`${url.pathname}index.html`:url.pathname,file=path.resolve(root,`.${rel}`);
    if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404,body:''});
    const type=file.endsWith('.html')?'text/html':file.endsWith('.mjs')?'text/javascript':file.endsWith('.css')?'text/css':'application/octet-stream';
    let body=fs.readFileSync(file);if(type==='text/html')body=Buffer.from(body.toString('utf8').replace('data-analytics-enabled="false"','data-analytics-enabled="true"'));
    return route.fulfill({status:200,contentType:type,body});
  });
  await page.goto(`https://freemy.ai/zh/?freemy_analytics=${mode}`,{waitUntil:'domcontentloaded'});
  return {context,page};
}
try{
  let {context,page}=await setup();
  const card=page.locator('.creation-card').first(),control=card.locator('[data-share-control]');
  await control.locator('[data-share-toggle]').click();await control.locator('[data-share-copy="en"]').click();
  await control.locator('[data-share-qr]').click();await control.locator('[data-share-qr-view]').waitFor({state:'visible'});
  await control.locator('[data-share-x]').evaluate(el=>el.addEventListener('click',event=>event.preventDefault()));await control.locator('[data-share-x]').click();
  let events=await page.evaluate(()=>window.__events);
  assert.deepEqual(events.map(event=>event.name),['share_menu_open','share_copy','share_qr_open','share_x_open']);
  assert.equal(events[1].data.placement,'qa:zh:home:card-en');
  assert.ok(events.every(event=>event.data.work_id===events[0].data.work_id));
  await page.goto('https://freemy.ai/en/contact/',{waitUntil:'domcontentloaded'});
  await page.locator('[data-contact-copy]').click();
  await page.locator('.contact-address a').evaluate(el=>el.addEventListener('click',event=>event.preventDefault()));await page.locator('.contact-address a').click();
  events=await page.evaluate(()=>window.__events);assert.deepEqual(events.map(event=>event.name),['contact_copy','contact_click']);
  assert.ok(!JSON.stringify(events).includes('ai@freemy.ai'));await context.close();

  ({context,page}=await setup({denied:true}));
  const failed=page.locator('.creation-card').first().locator('[data-share-control]');
  await failed.locator('[data-share-toggle]').click();await failed.locator('[data-share-copy="zh"]').click();await failed.locator('[data-share-native]').click();
  assert.deepEqual((await page.evaluate(()=>window.__events)).map(event=>event.name),['share_menu_open'],'failed copy and cancelled share are not successes');
  assert.ok(await failed.locator('[data-share-manual]').isVisible());await context.close();

  ({context,page}=await setup({mode:'off',blocked:true}));
  const off=page.locator('.creation-card').first().locator('[data-share-control]');await off.locator('[data-share-toggle]').click();await off.locator('[data-share-copy="en"]').click();
  assert.deepEqual(await page.evaluate(()=>window.__events),[]);assert.match(await off.locator('[data-share-status]').innerText(),/已复制/);
  await context.close();
  console.log('Share analytics browser checks passed: QA tagging, no duplicates, privacy, failure and off mode.');
}finally{await browser.close();}
