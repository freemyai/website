// Captures only the hand-picked public works below, in a clean browser profile.
// Run locally; this is not a visitor-facing URL fetcher.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import dns from 'node:dns/promises';
import net from 'node:net';

const targets = [
  ['hydraulics','https://hydraulics.wasmer.app/'],
  ['electric-motor','https://electric-motor.wasmer.app/'],
  ['light-and-optics','https://iamtechartist.com/light-and-optics/'],
  ['triple-pendulum','https://aksamustu.itch.io/triple-pendulum-lab'],
  ['wave-tank','https://dalgatanki.sezlab.dev/'],
  ['windtunnel','https://windtunnel-vis.vercel.app/'],
  ['star-hop','https://www.star-hop.app/'],
  ['hearthlight','https://hearthlight.github.io/'],
  ['harmonograph','https://miaai-lab.github.io/Claude-Opus-5.5-100-HTML-Files/097-harmonograph.html'],
  ['infinite-room','https://miaai-lab.github.io/Claude-Opus-5.5-100-HTML-Files/099-droste-infinite-zoom.html'],
  ['chroma','https://miaai-lab.github.io/Claude-Opus-5.5-100-HTML-Files/071-palette-studio.html']
];
const output = path.resolve('assets/media');
fs.mkdirSync(output,{recursive:true});
const executablePath = process.env.FREEMY_BROWSER_PATH || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browser = await chromium.launch({executablePath, headless:true, args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
function privateAddress(host) {
  host=host.toLowerCase().replace(/^\[|\]$/g,'');
  if(host==='localhost'||host.endsWith('.localhost')||host.endsWith('.local')||host.endsWith('.internal')) return true;
  if(net.isIP(host)===6) return host==='::'||host==='::1'||/^(fc|fd|fe[89ab])/i.test(host)||host.startsWith('::ffff:');
  const m=host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  return !!m && (+m[1]===10||+m[1]===127||+m[1]===0||+m[1]>=224||+m[1]===169&&+m[2]===254||+m[1]===192&&+m[2]===168||+m[1]===172&&+m[2]>=16&&+m[2]<=31||+m[1]===100&&+m[2]>=64&&+m[2]<=127);
}
const dnsCache=new Map();
async function unsafe(raw) {
  try {
    const u = new URL(raw); const host=u.hostname.toLowerCase().replace(/^\[|\]$/g,'');
    if (!['http:','https:'].includes(u.protocol)||u.username||u.password||privateAddress(host)) return true;
    if(net.isIP(host)) return false;
    if(!dnsCache.has(host)) dnsCache.set(host,dns.lookup(host,{all:true}).then(a=>!a.length||a.some(x=>privateAddress(x.address))).catch(()=>true));
    return await dnsCache.get(host);
  } catch { return true; }
}
for (const [slug,url] of targets.filter(([slug]) => !process.argv[2] || process.argv[2] === slug)) {
  const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1,acceptDownloads:false});
  await context.route('**/*', async route => !['GET','HEAD'].includes(route.request().method()) || await unsafe(route.request().url()) ? route.abort() : route.continue());
  const page=await context.newPage();
  try {
    const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});
    await page.waitForTimeout(slug === 'hydraulics' ? 25000 : 8000);
    if (slug === 'light-and-optics') {
      const proceed=page.getByText('Open anyway');if(await proceed.count())await proceed.first().click();
      await page.waitForTimeout(5000);
      for(const frame of page.frames()){const enter=frame.getByText('Enter without sound');if(await enter.count()){await enter.first().click();break;}}
      await page.waitForTimeout(15000);
    }
    if (slug === 'windtunnel') {
      const skip=page.getByRole('button',{name:'Skip'});
      if (await skip.count()) { await skip.click(); await page.waitForTimeout(4000); }
    }
    const clip=slug==='triple-pendulum'?await page.locator('iframe').first().boundingBox().catch(()=>null):null;
    await page.screenshot({path:path.join(output,`${slug}.jpg`),type:'jpeg',quality:82,...(clip?{clip}: {})});
    console.log(`${slug}: HTTP ${response?.status()} — ${await page.title()}`);
  } catch(error) { console.log(`${slug}: capture failed — ${error.message.split('\n')[0]}`); }
  await context.close();
}
await browser.close();
