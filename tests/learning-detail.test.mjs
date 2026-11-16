import test from 'node:test';
import assert from 'node:assert/strict';
import { renderLearningDetails } from '../src/learning-detail.mjs';

const text={zh:'前端文件；其他素材可能另有许可。',en:'Front-end file; other assets may have separate licenses.'};
const source={id:'tree-code',provider:'github',kind:'source_code',url:'https://github.com/simonw/tools/blob/main/tree-appreciator.html',repository_url:'https://github.com/simonw/tools',relation:'exact_project',code_scope:'frontend',match_status:'verified',availability:'available',publication:'published',checked_at:'2026-11-16',evidence:[{type:'source_file',url:'https://github.com/simonw/tools/blob/main/tree-appreciator.html',summary:'Exact file.'}],license:{status:'open_source_verified',expression:'Apache-2.0',evidence_url:'https://github.com/simonw/tools/blob/main/LICENSE',scope_note:text},notes:text};
const work={id:'tree-appreciator',learning:{sources:[source],notes:{en:null,zh:null},allowedLicenses:['Apache-2.0']}};

test('detail gives verified source, scope, license, date, and correction link',()=>{
  const html=renderLearningDetails(work,'en');
  assert.match(html,/id="source"/);assert.match(html,/front-end source/i);assert.match(html,/Apache-2\.0/);assert.match(html,/2026-11-16/);
  assert.match(html,/data-track-event="source_open"/);assert.match(html,/href="\/en\/submit\/"/);
});

test('unconfirmed and restricted licenses remain explicit and never become open-source click actions',()=>{
  const unknown={...source,license:{...source.license,status:'source_visible',expression:null,evidence_url:null}};
  const restricted={...source,license:{...source.license,status:'restricted',expression:'CC-BY-NC-4.0'}};
  for(const [item,label] of [[unknown,/license unconfirmed/i],[restricted,/license restricted/i]]){
    const html=renderLearningDetails({...work,learning:{...work.learning,sources:[item]}},'en');
    assert.match(html,label);assert.doesNotMatch(html,/data-track-event="source_open"/);
  }
});

test('unpublished, unavailable and unrelated resources leave no empty section',()=>{
  for(const change of [{publication:'candidate'},{availability:'unavailable'},{relation:'upstream'}]){
    assert.equal(renderLearningDetails({...work,learning:{...work.learning,sources:[{...source,...change}]}},'en'),'');
  }
});

test('models are labeled as related resources rather than application source',()=>{
  const model={...source,provider:'huggingface',kind:'model',url:'https://huggingface.co/owner/model',repository_url:null,code_scope:'not_applicable',license:{...source.license,status:'not_applicable'}};
  const html=renderLearningDetails({...work,learning:{...work.learning,sources:[model]}},'en');
  assert.match(html,/Model/);assert.doesNotMatch(html,/front-end source/i);assert.doesNotMatch(html,/data-track-event="source_open"/);
});

test('a reviewed technical tag links to its evidence',()=>{
  const tag={id:'webgl',status:'verified',label:{en:'WebGL',zh:'WebGL'},evidence_url:'https://github.com/simonw/tools/blob/main/tree-appreciator.html'};
  const html=renderLearningDetails({...work,learning:{...work.learning,technicalTags:[tag]}},'en');
  assert.match(html,/WebGL/);assert.match(html,/href="https:\/\/github\.com\/simonw\/tools\/blob\/main\/tree-appreciator\.html"/);
});
