import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { loadCatalog, root } from '../src/validate.mjs';

test('build publishes real gallery media and preserves bilingual work routes', () => {
  execFileSync(process.execPath,['src/build.mjs'],{cwd:root,stdio:'pipe'});
  const catalog=loadCatalog(), home=fs.readFileSync(path.join(root,'dist/index.html'),'utf8');
  const english=fs.readFileSync(path.join(root,'dist/en/works/hydraulics/index.html'),'utf8');
  assert.ok(catalog.gallery.length>=6);
  for(const work of catalog.gallery){
    assert.ok(home.includes(work.media.poster.src),`Missing home preview for ${work.id}`);
    assert.ok(fs.existsSync(path.join(root,'dist',work.media.poster.src.slice(1))),`Missing output image for ${work.id}`);
  }
  assert.match(english,/<html lang="en">/);
  assert.match(english,/How Hydraulics Work/);
  assert.match(english,/hreflang="zh-Hans" href="https:\/\/freemy\.ai\/works\/hydraulics\/"/);
  assert.ok(fs.existsSync(path.join(root,'dist/works/gears/index.html')));
  assert.ok(fs.existsSync(path.join(root,'dist/en/works/gears/index.html')));
});
