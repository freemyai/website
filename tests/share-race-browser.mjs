import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';

const executablePath=process.env.FREEMY_BROWSER_PATH||'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browser=await chromium.launch({executablePath,headless:true});
try{
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  await page.addInitScript(()=>{
    Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:()=>new Promise((resolve,reject)=>{window.__rejectOldCopy=reject;})}});
    Object.defineProperty(navigator,'share',{configurable:true,value:()=>new Promise((resolve,reject)=>{window.__rejectOldNative=reject;})});
  });
  await page.goto('http://127.0.0.1:4177/zh/',{waitUntil:'domcontentloaded'});
  const cards=page.locator('.creation-card'),dialog=page.locator('#preview-dialog');
  await cards.nth(0).locator('[data-preview]').click();await dialog.locator('[data-share-toggle]').click();
  await dialog.locator('[data-share-copy="zh"]').click();
  await page.waitForFunction(()=>typeof window.__rejectOldCopy==='function');
  await dialog.locator('.dialog-close').click();
  await cards.nth(1).locator('[data-preview]').click();await dialog.locator('[data-share-toggle]').click();
  await page.evaluate(async()=>{window.__rejectOldCopy(new Error('permission denied'));await Promise.resolve();await Promise.resolve();});
  assert.equal(await dialog.locator('[data-share-manual]').isVisible(),false,'A failure must not show A’s URL in B');
  assert.equal(await dialog.locator('[data-share-toggle]').evaluate(el=>document.activeElement===el),true,'old completion must not steal focus');
  assert.equal(await dialog.locator('[data-share-status]').innerText(),'');
  await dialog.locator('.dialog-close').click();await cards.nth(0).locator('[data-preview]').click();
  await dialog.locator('[data-share-toggle]').click();await dialog.locator('[data-share-native]').click();
  await page.waitForFunction(()=>typeof window.__rejectOldNative==='function');await dialog.locator('.dialog-close').click();
  await cards.nth(1).locator('[data-preview]').click();await dialog.locator('[data-share-toggle]').click();
  await page.evaluate(async()=>{window.__rejectOldNative(Object.assign(new Error('denied'),{name:'NotAllowedError'}));await Promise.resolve();await Promise.resolve();});
  assert.equal(await dialog.locator('[data-share-status]').innerText(),'','A native share failure must not alter B');
  console.log('Stale share permission result cannot affect the next preview.');
}finally{await browser.close();}
