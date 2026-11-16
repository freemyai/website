import { escapeHtml as e } from './catalog.mjs';
import { messages, urlFor } from './i18n.mjs';
import { eligibleSourceLink, safeLearningUrl } from './learning-resources.mjs';
import { renderLearningNote } from './learning-content.mjs';

const visible = source => source?.publication==='published' && source.match_status==='verified' &&
  source.availability==='available' && source.relation==='exact_project' && !!safeLearningUrl(source.url);
const providerName = source => ({github:'GitHub',huggingface:'Hugging Face',gitlab:'GitLab',codeberg:'Codeberg',gitee:'Gitee'}[source.provider]||'');
const trackProvider = source => ['github','huggingface'].includes(source.provider)?source.provider:'other';

function codeLabel(source,lang,open){
  const m=messages[lang];
  if(!open && ['source_visible','unknown'].includes(source.license?.status))return m.publicCode;
  if(!open && source.license?.status==='restricted')return m.restrictedCode;
  const scope=lang==='zh'?{full_project:'源码',frontend:'前端源码',module:'模块源码'}:{full_project:'source',frontend:'front-end source',module:'module source'};
  return [providerName(source),scope[source.code_scope]||(lang==='zh'?'公开代码':'Public code')].filter(Boolean).join(' ');
}
function resourceEntry(source,work,lang,allowedLicenses){
  const m=messages[lang], code=['source_code','space_code'].includes(source.kind), open=code&&eligibleSourceLink(source,{allowedLicenses});
  const label=code?codeLabel(source,lang,open):source.kind==='model'?(lang==='zh'?'模型':'Model'):source.kind==='dataset'?(lang==='zh'?'数据集':'Dataset'):m.creatorNotes;
  const sourceTracking=open?` data-track-event="source_open" data-track-work="${e(work.id)}" data-track-placement="source-${trackProvider(source)}-detail"`:source.kind==='author_guide'?` data-track-event="learning_open" data-track-work="${e(work.id)}" data-track-placement="learning-guide-detail"`:'';
  const license=source.license||{}, licenseUrl=safeLearningUrl(license.evidence_url), licenseText=license.expression||'';
  const licenseLine=licenseText?`<span>${e(m.license)}: ${licenseUrl?`<a href="${e(licenseUrl)}" target="_blank" rel="noopener noreferrer">${e(licenseText)} ↗</a>`:e(licenseText)}</span>`:'';
  const scope=license.scope_note?.[lang]||'';
  return `<li><a href="${e(safeLearningUrl(source.url))}" target="_blank" rel="noopener noreferrer"${sourceTracking}>${e(label)} ↗</a><div class="source-meta">${licenseLine}${licenseLine&&source.checked_at?' · ':''}${source.checked_at?`${e(m.resourceChecked)}: ${e(source.checked_at)}`:''}${scope?`<p>${e(scope)}</p>`:''}</div></li>`;
}

export function renderLearningDetails(work,lang){
  const learning=work.learning;if(!learning)return '';
  const m=messages[lang], sources=(learning.sources||[]).filter(visible), notes=learning.notes?.[lang]||null;
  const guides=sources.filter(source=>source.kind==='author_guide'), resourceSources=sources.filter(source=>source.kind!=='author_guide');
  // If a Freemy note exists, creator material remains available alongside other sources.
  const items=[...resourceSources,...(notes?guides:[])];
  const tags=(learning.technicalTags||[]).filter(tag=>tag.status==='verified'&&safeLearningUrl(tag.evidence_url)&&tag.label?.[lang]);
  const tagsHtml=tags.length?`<h3>${lang==='zh'?'已核验技术':'Verified technology'}</h3><p>${tags.map(tag=>`<a href="${e(safeLearningUrl(tag.evidence_url))}" target="_blank" rel="noopener noreferrer">${e(tag.label[lang])} ↗</a>`).join(' · ')}</p>`:'';
  const resources=items.length||tags.length?`<section id="source" class="source-resources"><h2>${e(m.sourceResources)}</h2>${items.length?`<ul>${items.map(source=>resourceEntry(source,work,lang,learning.allowedLicenses)).join('')}</ul>`:''}${tagsHtml}<p><a href="${e(urlFor(lang,'/submit/'))}">${e(m.suggestCorrection)} →</a></p></section>`:'';
  const guidance=!notes&&guides.length?`<section id="learning" class="source-resources"><h2>${e(m.creatorNotes)}</h2><ul>${guides.map(source=>resourceEntry(source,work,lang,learning.allowedLicenses)).join('')}</ul></section>`:'';
  return `${resources}${notes?renderLearningNote(notes,lang):guidance}`;
}
