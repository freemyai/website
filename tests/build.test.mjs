import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { loadCatalog, root } from '../src/validate.mjs';

test('build publishes real gallery media and preserves bilingual work routes', () => {
  execFileSync(process.execPath,['src/build.mjs'],{cwd:root,stdio:'pipe'});
  const catalog=loadCatalog(), home=fs.readFileSync(path.join(root,'dist/index.html'),'utf8');
  const chineseHome=fs.readFileSync(path.join(root,'dist/zh/index.html'),'utf8');
  const english=fs.readFileSync(path.join(root,'dist/en/works/hydraulics/index.html'),'utf8');
  assert.ok(catalog.gallery.length>=6);
  assert.match(home,/<html lang="en">/);
  assert.match(chineseHome,/<html lang="zh-CN">/);
  assert.match(home,/href="https:\/\/freemy\.ai\/"/);
  assert.match(home,/hreflang="x-default" href="https:\/\/freemy\.ai\/"/);
  assert.match(home,/href="\/zh\/" data-language-switch/);
  assert.match(home,/_vercel\/insights\/script\.js/);
  assert.match(home,/_vercel\/speed-insights\/script\.js/);
  assert.match(fs.readFileSync(path.join(root,'dist/en/privacy/index.html'),'utf8'),/Vercel Web Analytics/);
  for(const work of catalog.gallery){
    assert.ok(home.includes(work.media.poster.src),`Missing home preview for ${work.id}`);
    assert.ok(fs.existsSync(path.join(root,'dist',work.media.poster.src.slice(1))),`Missing output image for ${work.id}`);
  }
  assert.match(english,/<html lang="en">/);
  assert.match(english,/How Hydraulics Work/);
  assert.match(english,/hreflang="zh-Hans" href="https:\/\/freemy\.ai\/works\/hydraulics\/"/);
  assert.match(english,/hreflang="x-default" href="https:\/\/freemy\.ai\/en\/works\/hydraulics\/"/);
  assert.ok(fs.existsSync(path.join(root,'dist/works/gears/index.html')));
  assert.ok(fs.existsSync(path.join(root,'dist/en/works/gears/index.html')));
  const missing=fs.readFileSync(path.join(root,'dist/404.html'),'utf8');
  assert.match(missing,/没有找到这个页面/);
  assert.match(missing,/This page could not be found/);
  assert.match(missing,/href="\/en\/explore\/"/);
});
