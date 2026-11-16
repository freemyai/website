// Offline only: publication decisions require independent editorial review.
import { loadCatalog } from '../src/validate.mjs';

if(process.argv.length>2)throw new Error('This audit is offline and accepts no network options.');
const catalog=loadCatalog();
const works=catalog.works.filter(work=>work.learning);
const sources=works.flatMap(work=>work.learning.sources);
const counts={
  reviewedWorks:works.length,
  openSourceWorks:works.filter(work=>work.hasOpenSource).length,
  publicCodeWithoutConfirmedLicense:sources.filter(source=>['source_code','space_code'].includes(source.kind)&&['source_visible','unknown'].includes(source.license.status)).length,
  restrictedCode:sources.filter(source=>['source_code','space_code'].includes(source.kind)&&source.license.status==='restricted').length,
  creatorGuides:sources.filter(source=>source.kind==='author_guide').length,
  bilingualNotes:works.filter(work=>work.hasLearningNote).length
};
console.log(`Learning resource audit PASS: ${JSON.stringify(counts)}. Candidate files are not loaded into the site.`);
