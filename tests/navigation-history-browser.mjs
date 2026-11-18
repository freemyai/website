import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';

const executablePath=process.env.FREEMY_BROWSER_PATH||'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browser=await chromium.launch({executablePath,headless:true});
try{
  const page=await browser.newPage({viewport:{width:1440,height:900}}),base='http://127.0.0.1:4177';
  await page.goto(`${base}/zh/`,{waitUntil:'domcontentloaded'});
  await page.evaluate(()=>{history.replaceState({opaque:'preserved'},'',location.href);scrollTo(0,2100);});
  await page.waitForFunction(()=>Math.abs(scrollY-2100)<5);
  await page.goto(`${base}/works/hydraulics/`,{waitUntil:'domcontentloaded'});
  await page.goto(`${base}/zh/`,{waitUntil:'domcontentloaded'});
  await page.evaluate(()=>scrollTo(0,5400));await page.waitForFunction(()=>Math.abs(scrollY-5400)<5);
  await page.goBack({waitUntil:'domcontentloaded'});await page.goBack({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('#gallery-grid'));
  await page.waitForFunction(()=>Math.abs(scrollY-2100)<8,null,{timeout:10000});
  assert.ok(Math.abs((await page.evaluate(()=>scrollY))-2100)<8,'each history entry restores its own position');
  assert.equal(await page.evaluate(()=>history.state.opaque),'preserved');
  console.log('Repeated visits to one list retain distinct history-entry scroll positions.');
}finally{await browser.close();}
