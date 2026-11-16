import test from 'node:test';
import assert from 'node:assert/strict';
import { card, controls, previewDialog } from '../src/components.mjs';
import { filterWorks } from '../src/catalog.mjs';

const work = {
  id:'tree-appreciator', slug:'tree-appreciator', type:'games', title_original:'Tree Appreciator',
  demo_url:'https://tools.simonwillison.net/tree-appreciator', creator:{name:'Simon Willison'},
  locales:{en:{title:'Tree Appreciator',summary:'Compare trees'},zh:{title:'赏树找不同',summary:'比较两棵树'}},
  media:{poster:{src:'/media/tree-appreciator-960.webp',base:'tree-appreciator',width:960,height:600}},
  ai_provenance:{status:'author_claimed',usage:'coding',evidence_url:'https://example.org/creator'},
  editorial:{status:'published',featured_order:1}, added_at:'2026-11-16',
  hasOpenSource:true, hasLearningNote:true,
  learningPublic:{en:{hasOpenSource:true,hasLearningNote:true,actions:[
    {kind:'source',provider:'github',href:'https://github.com/simonw/tools/blob/main/tree-appreciator.html',label:'GitHub front-end source',ariaLabel:'GitHub front-end source for Tree Appreciator',external:true},
    {kind:'learning_note',provider:'other',href:'/en/works/tree-appreciator/#learning',label:'Learning notes',ariaLabel:'Learning notes for Tree Appreciator',external:false}
  ]}}
};

test('cards with reviewed resources keep distinct direct source and learning links', () => {
  const html=card(work,'en');
  assert.match(html,/href="https:\/\/github\.com\/simonw\/tools\/blob\/main\/tree-appreciator\.html"/);
  assert.match(html,/data-track-event="source_open"/);
  assert.match(html,/data-track-placement="source-github-card"/);
  assert.match(html,/href="\/en\/works\/tree-appreciator\/#learning"/);
  assert.match(html,/data-track-event="learning_open"/);
  assert.match(html,/data-track-work="tree-appreciator"/);
  assert.match(html,/data-track-event="experience_open"/);
});

test('cards without reviewed resources show no placeholder, preview starts empty', () => {
  const html=card({...work,learningPublic:undefined,hasOpenSource:false,hasLearningNote:false},'en');
  assert.doesNotMatch(html,/data-track-event="(?:source_open|learning_open)"/);
  const dialog=previewDialog('en');
  assert.match(dialog,/id="preview-learning-actions"/);
  assert.doesNotMatch(dialog,/href="https:\/\/github\.com\/simonw/);
});

test('open-source and learning filters preserve default results and use reviewed public flags', () => {
  const source={id:'source',hasOpenSource:true,hasLearningNote:false};
  const note={id:'note',hasOpenSource:false,hasLearningNote:true};
  const both={id:'both',hasOpenSource:true,hasLearningNote:true};
  const neither={id:'neither'};
  const all=[source,note,both,neither];
  assert.deepEqual(filterWorks(all).map(w=>w.id),['source','note','both','neither']);
  assert.deepEqual(filterWorks(all,{open_source:true}).map(w=>w.id),['source','both']);
  assert.deepEqual(filterWorks(all,{learning_note:true}).map(w=>w.id),['note','both']);
  assert.deepEqual(filterWorks(all,{open_source:true,learning_note:true}).map(w=>w.id),['both']);
  const html=controls('en');
  assert.match(html,/name="open_source"/);
  assert.match(html,/name="learning_note"/);
});
