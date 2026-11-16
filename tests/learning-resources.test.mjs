import test from 'node:test';
import assert from 'node:assert/strict';

// A missing module is an expected red state when this test is first run.
const policy = await import('../src/learning-resources.mjs').catch(error => {
  if (error.code === 'ERR_MODULE_NOT_FOUND' && error.message.includes('learning-resources.mjs')) return {};
  throw error;
});
const approved = new Set(['Apache-2.0', 'MIT']);
const text = {zh:'已检查。',en:'Reviewed.'};
function source(overrides={}) {
  return {
    id:'tree-source',provider:'github',kind:'source_code',
    url:'https://github.com/simonw/tools/blob/main/tree-appreciator.html',
    repository_url:'https://github.com/simonw/tools',relation:'exact_project',code_scope:'frontend',
    match_status:'verified',availability:'available',
    license:{status:'open_source_verified',expression:'Apache-2.0',evidence_url:'https://github.com/simonw/tools/blob/abc/LICENSE',scope_note:text},
    evidence:[{type:'source_file',url:'https://github.com/simonw/tools/blob/abc/tree-appreciator.html',summary:'Matching source file.'}],
    checked_at:'2026-11-16',revision:'abc',publication:'published',notes:text,
    ...overrides,
  };
}
function note(overrides={}) {
  return {status:'published',kind:'source_walkthrough',zh_path:'content/learning/zh/tree-appreciator.json',en_path:'content/learning/en/tree-appreciator.json',reviewed_at:'2026-11-16',evidence_urls:['https://github.com/simonw/tools/blob/abc/tree-appreciator.html'],...overrides};
}
function record(overrides={}) {
  return {work_id:'tree-appreciator',search:{status:'searched',checked_at:'2026-11-16',notes:text},sources:[source()],learning_note:note(),...overrides};
}
const options = {allowedLicenses:approved,noteHref:'/en/works/tree-appreciator/#learning'};

test('only an explicitly verified exact open-source project is eligible', () => {
  assert.equal(typeof policy.eligibleSourceLink,'function');
  assert.equal(policy.eligibleSourceLink(source(),options),true);
  for (const value of [
    source({publication:'candidate'}), source({match_status:'candidate'}), source({availability:'restricted'}),
    source({relation:'upstream'}), source({kind:'model'}), source({code_scope:'unknown'}),
    source({license:{...source().license,status:'source_visible'}}),
    source({license:{...source().license,expression:'CC-BY-NC-4.0'}}),
    source({license:{...source().license,evidence_url:null}}),source({evidence:[]}),
  ]) assert.equal(policy.eligibleSourceLink(value,options),false);
  assert.equal(policy.eligibleSourceLink(source()),false,'a missing license policy fails closed');
});

test('platform source URLs cannot be author profiles, mismatched repos or disguised hosts', () => {
  for(const url of [
    'https://github.com/simonw',
    'https://github.com.evil.example/simonw/tools/blob/main/tree-appreciator.html',
    'https://github.com@evil.example/simonw/tools/blob/main/tree-appreciator.html',
    'https://github.com:444/simonw/tools/blob/main/tree-appreciator.html',
    'https://github.com/simonw/other/blob/main/tree-appreciator.html',
    'https://github.com/simonw/tools/issues/1',
    'javascript:alert(1)',
  ]) assert.equal(policy.eligibleSourceLink(source({url}),options),false,url);
});

test('a Hugging Face demo or model is not an exposed Space code tree', () => {
  const space = source({provider:'huggingface',kind:'space_code',url:'https://huggingface.co/spaces/owner/demo/tree/main',repository_url:'https://huggingface.co/spaces/owner/demo'});
  assert.equal(policy.eligibleSourceLink(space,options),true);
  assert.equal(policy.eligibleSourceLink({...space,url:'https://huggingface.co/spaces/owner/demo'},options),false);
  assert.equal(policy.eligibleSourceLink({...space,kind:'model',url:'https://huggingface.co/owner/model'},options),false);
  assert.equal(policy.eligibleSourceLink({...space,kind:'source_code',url:'https://huggingface.co/owner/model'},options),false);
  assert.equal(policy.eligibleSourceLink({...space,url:'https://huggingface.co/spaces/owner/demo/blob/main'},options),false);
  assert.equal(policy.eligibleSourceLink(source({kind:'space_code'}),options),false);
});

test('a provider cannot be relabeled as other and a license alone does not establish project identity', () => {
  assert.equal(policy.eligibleSourceLink(source({provider:'other',url:'https://github.com/simonw',repository_url:null}),options),false);
  assert.equal(policy.eligibleSourceLink(source({evidence:[{type:'license_file',url:'https://github.com/simonw/tools/blob/main/LICENSE',summary:'License.'}]}),options),false);
  assert.equal(policy.eligibleSourceLink(source({id:'bad id'}),options),false);
  assert.equal(policy.eligibleSourceLink(source({license:{...source().license,evidence_url:'https://github.com/unrelated/project/blob/main/LICENSE'}}),options),false);
});

test('partial source labels are truthful and public payload contains no editorial evidence', () => {
  const result=policy.publicLearningPayload(record(),'en',options);
  assert.equal(result.hasOpenSource,true);
  assert.equal(result.hasLearningNote,true);
  assert.deepEqual(result.actions.map(action=>action.kind),['source','learning_note']);
  assert.match(result.actions[0].label,/front.end source/i);
  assert.equal(result.actions[0].href,source().url);
  assert.equal(result.actions[1].href,options.noteHref);
  assert.equal(result.actions[1].external,false);
  assert.ok(!JSON.stringify(result).includes('Matching source file'));
  assert.ok(result.actions.every(action=>action.ariaLabel&&action.resourceId));
});

test('published author guidance can accompany source but not masquerade as a learning note', () => {
  const guide=source({id:'creator-guide',kind:'author_guide',code_scope:'not_applicable',url:'https://github.com/simonw/tools/blob/main/README.md',license:{status:'not_applicable',expression:null,evidence_url:null,scope_note:text}});
  const r=record({sources:[source(),guide],learning_note:note({status:'draft'})});
  const result=policy.publicLearningPayload(r,'zh',options);
  assert.deepEqual(result.actions.map(action=>action.kind),['source','author_guide']);
  assert.equal(result.hasLearningNote,false);
});

test('notes and source actions are omitted for drafts, incomplete translations and invalid targets', () => {
  for(const n of [note({status:'draft'}),note({en_path:null}),note({zh_path:'content/learning/zh/../secret.json'}),note({evidence_urls:[]}),note({reviewed_at:null})]) {
    const result=policy.publicLearningPayload(record({sources:[],learning_note:n}),'en',options);
    assert.equal(result.hasLearningNote,false);
    assert.deepEqual(result.actions,[]);
  }
  const result=policy.publicLearningPayload(record({sources:[]}),'en',{...options,noteHref:'https://attacker.example/#learning'});
  assert.equal(result.hasLearningNote,false);
  assert.deepEqual(result.actions,[]);
});

test('resource validation catches unknown work, duplicate IDs, missing proof and unsafe note paths', () => {
  assert.equal(typeof policy.validateLearningRecord,'function');
  const config={workIds:new Set(['tree-appreciator']),allowedLicenses:approved};
  assert.deepEqual(policy.validateLearningRecord(record(),config),[]);
  for(const bad of [
    record({work_id:'unknown'}),
    record({sources:[source(),source()]}),
    record({sources:[source({evidence:[]})]}),
    record({sources:[source({checked_at:null})]}),
    record({sources:[source({url:'http://github.com/simonw/tools'})]}),
    record({sources:[source({license:{...source().license,evidence_url:null}})]}),
    record({learning_note:note({zh_path:'content/learning/zh/../secret.json'})}),
    record({learning_note:note({en_path:null})}),
  ]) assert.ok(policy.validateLearningRecord(bad,config).length>0,JSON.stringify(bad));
});

test('distinct works may reference different files in the same repository', () => {
  const other=record({work_id:'other',sources:[source({id:'other-source',url:'https://github.com/simonw/tools/blob/main/other.html'})],learning_note:note({status:'absent',kind:null,zh_path:null,en_path:null,reviewed_at:null,evidence_urls:[]})});
  assert.deepEqual(policy.validateLearningRecord(other,{workIds:new Set(['other']),allowedLicenses:approved}),[]);
});

test('external learning URLs reject local networks, credentials and non-HTTPS protocols', () => {
  assert.equal(typeof policy.safeLearningUrl,'function');
  assert.equal(policy.safeLearningUrl('https://example.org/path'),'https://example.org/path');
  for(const url of ['http://example.org/', 'javascript:alert(1)','data:text/html,x','https://name:secret@example.org/', 'https://example.org:444/', 'https://localhost/a', 'https://127.0.0.1/a', 'https://192.168.1.1/a', 'https://[::1]/a']) assert.equal(policy.safeLearningUrl(url),null,url);
});
