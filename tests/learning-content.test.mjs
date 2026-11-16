import test from 'node:test';
import assert from 'node:assert/strict';
import { loadPublishedLearningNote, renderLearningNote } from '../src/learning-content.mjs';

const record = {
  work_id: 'tree-appreciator',
  learning_note: {
    status: 'published', kind: 'source_walkthrough',
    zh_path: 'content/learning/zh/tree-appreciator.json',
    en_path: 'content/learning/en/tree-appreciator.json',
    reviewed_at: '2026-11-16', evidence_urls: ['https://github.com/simonw/tools/blob/main/tree-appreciator.html']
  }
};
const note = (kind='source_walkthrough') => ({
  kind, title: 'A <tree>', summary: 'Observe & compare.',
  sections: [{ heading: 'Start', paragraphs: ['Read <script>alert(1)</script>'], bullets: ['Try & change'] }],
  references: [{ id: 'source', label: 'Source', url: 'https://github.com/simonw/tools/blob/main/tree-appreciator.html' }]
});
const reader = files => relative => {
  if (!(relative in files)) throw new Error('missing note');
  return JSON.stringify(files[relative]);
};
const bilingual = { [record.learning_note.zh_path]: note(), [record.learning_note.en_path]: note() };

test('draft notes never render or read files', () => {
  const draft={...record, learning_note:{...record.learning_note,status:'draft'}};
  assert.equal(loadPublishedLearningNote(draft,'en',{readText:()=>{throw new Error('must not read');}}),null);
});

test('a published note requires both complete languages and safe matching paths', () => {
  assert.equal(loadPublishedLearningNote(record,'en',{readText:reader(bilingual)}).title,'A <tree>');
  assert.throws(()=>loadPublishedLearningNote(record,'zh',{readText:reader({[record.learning_note.zh_path]:note()})}),/missing/i);
  const unsafe={...record,learning_note:{...record.learning_note,en_path:'content/learning/en/../../secret.json'}};
  assert.throws(()=>loadPublishedLearningNote(unsafe,'en',{readText:reader(bilingual)}),/path/i);
  const incomplete={...bilingual,[record.learning_note.en_path]:{...note(),sections:[]}};
  assert.throws(()=>loadPublishedLearningNote(record,'zh',{readText:reader(incomplete)}),/note|section/i);
});

test('notes escape text and implementation ideas identify themselves in both languages', () => {
  const html=renderLearningNote(note(),'en');
  assert.match(html,/A &lt;tree&gt;/);
  assert.match(html,/&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(html,/<script>/);
  assert.match(renderLearningNote(note('implementation_idea'),'en'),/not the original creator/i);
  assert.match(renderLearningNote(note('implementation_idea'),'zh'),/不是原作者/);
});

test('source links in note references must be safe HTTPS URLs', () => {
  const unsafeNote={...note(),references:[{id:'x',label:'Source',url:'javascript:alert(1)'}]};
  assert.throws(()=>loadPublishedLearningNote(record,'en',{readText:reader({...bilingual,[record.learning_note.en_path]:unsafeNote})}),/reference|url/i);
});
