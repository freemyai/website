import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog } from '../src/validate.mjs';

const index=await import('../scripts/export-share-index.mjs').catch(error=>{
  if(error.code==='ERR_MODULE_NOT_FOUND')return {};
  throw error;
});
const qr=await import('../assets/share-qr.mjs').catch(error=>{
  if(error.code==='ERR_MODULE_NOT_FOUND')return {};
  throw error;
});

test('share index contains exactly two public records per published creation',()=>{
  assert.equal(typeof index.exportShareIndex,'function','share index exporter must exist');
  const catalog=loadCatalog(), rows=index.exportShareIndex(catalog,catalog.shareManifest);
  const published=catalog.works.filter(work=>work.editorial.status==='published');
  assert.equal(rows.length,published.length*2);
  const hydro=rows.filter(row=>row.work_id==='hydraulics');
  assert.deepEqual(hydro.map(row=>row.locale).sort(),['en','zh']);
  assert.equal(hydro.find(row=>row.locale==='en').share_url,'https://freemy.ai/hydraulics/');
  assert.equal(hydro.find(row=>row.locale==='zh').canonical_url,'https://freemy.ai/works/hydraulics/');
  assert.ok(rows.every(row=>!JSON.stringify(row).includes('learningPublic')&&!JSON.stringify(row).includes('insights')));
});

test('local QR generator produces a square matrix for a clean Freemy URL',()=>{
  assert.equal(typeof qr.buildQrMatrix,'function','QR generator must exist');
  const matrix=qr.buildQrMatrix('https://freemy.ai/zh/hydraulics/');
  assert.ok(matrix.size>=21);assert.equal(matrix.modules.length,matrix.size);
  assert.ok(matrix.modules.every(row=>row.length===matrix.size&&row.every(value=>typeof value==='boolean')));
  assert.equal(matrix.quietZone,4);
  for(const url of ['https://evil.example/','https://freemy.ai/hydraulics/?token=secret','https://freemy.ai/api/insights/'])assert.throws(()=>qr.buildQrMatrix(url),/invalid/i);
});
