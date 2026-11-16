import { filterWorks } from './catalog.mjs';
import { createTracker, createImpressionMonitor } from './analytics.mjs';

const lang=document.body.dataset.lang||'en';
const pageType=document.body.dataset.pageType||'unknown';
const analyticsEnabled=document.body.dataset.analyticsEnabled==='true';
const track=createTracker({enabled:analyticsEnabled,origin:location.origin,mode:window.__freemyAnalyticsMode,send:(...args)=>window.va?.(...args)});
const dialog=document.querySelector('#preview-dialog');
const detail=document.querySelector('[data-detail-work]');
if(pageType==='work'&&detail)track('work_view',{work_id:detail.dataset.detailWork,locale:lang,page_type:pageType,placement:'detail'});
document.addEventListener('click',event=>{
  const link=event.target.closest('[data-track-event]');
  if(!link)return;
  track(link.dataset.trackEvent,{work_id:link.dataset.trackWork,locale:lang,page_type:pageType,placement:link.dataset.trackPlacement});
});
const grid=document.querySelector('#gallery-grid');
const form=document.querySelector('#gallery-filter');
const sort=document.querySelector('#gallery-sort');
const sourceFilter=document.querySelector('#filter-open-source');
const noteFilter=document.querySelector('#filter-learning-note');
const empty=document.querySelector('#empty-results');
const surprise=document.querySelector('[data-surprise]');
const cards=grid?[...grid.querySelectorAll('.creation-card')].map(card=>({card,work:JSON.parse(card.dataset.work)})):[];
let visible=cards;
let refreshImpressions=()=>{};

function update(){
  const q=form?.elements.namedItem('q')?.value||'';
  const matches=new Set(filterWorks(cards.map(item=>item.work),{q,open_source:!!sourceFilter?.checked,learning_note:!!noteFilter?.checked}).map(w=>w.id));
  visible=cards.filter(item=>matches.has(item.work.id));
  const ordered=[...cards].sort((a,b)=>sort?.value==='recent'?(b.work.added_at||'').localeCompare(a.work.added_at||'')||b.work.sequence-a.work.sequence:a.work.order-b.work.order);
  for(const item of ordered){item.card.hidden=!matches.has(item.work.id);grid.append(item.card);}
  refreshImpressions();
  if(empty) empty.hidden=visible.length>0;
  if(surprise) surprise.setAttribute('aria-disabled',String(!visible.length));
  if(form){const next=new URL(location.href);if(q)next.searchParams.set('q',q);else next.searchParams.delete('q');for(const [name,on] of [['open_source',sourceFilter?.checked],['learning_note',noteFilter?.checked]]){if(on)next.searchParams.set(name,'1');else next.searchParams.delete(name);}history.replaceState(null,'',next);}
}
if(form&&grid){
  document.querySelector('.resource-filters')?.removeAttribute('hidden');
  const query=new URLSearchParams(location.search);
  form.elements.namedItem('q').value=query.get('q')||'';
  if(sourceFilter)sourceFilter.checked=query.get('open_source')==='1';
  if(noteFilter)noteFilter.checked=query.get('learning_note')==='1';
  form.addEventListener('input',update);
  form.addEventListener('submit',event=>{event.preventDefault();update();});
  sort?.addEventListener('change',update);
  sourceFilter?.addEventListener('change',update);
  noteFilter?.addEventListener('change',update);
  update();
}
document.querySelectorAll('[data-language-switch]').forEach(link=>link.addEventListener('click',()=>{
  link.search=location.search;
  link.hash=location.hash;
  try {localStorage.setItem('freemy-language',link.dataset.languageSwitch);} catch {}
}));
document.querySelectorAll('[data-surprise]').forEach(link=>link.addEventListener('click',event=>{
  event.preventDefault();
  if(visible.length) location.assign(visible[Math.floor(Math.random()*visible.length)].work.detail);
}));

if(analyticsEnabled&&document.body.dataset.impressionsEnabled==='true'&&'IntersectionObserver' in window){
  const targets=[...document.querySelectorAll('.creation-card [data-preview]')];
  let observer;
  const eligible=target=>{
    const card=target.closest('.creation-card'), rect=target.getBoundingClientRect();
    if(document.visibilityState!=='visible'||dialog?.open||!card||card.hidden||!target.getClientRects().length||rect.width<=0||rect.height<=0)return false;
    const width=Math.max(0,Math.min(rect.right,innerWidth)-Math.max(rect.left,0));
    const height=Math.max(0,Math.min(rect.bottom,innerHeight)-Math.max(rect.top,0));
    return width*height/(rect.width*rect.height)>=0.5;
  };
  const monitor=createImpressionMonitor({
    isStillVisible:target=>{
      const pending=observer.takeRecords();
      const interrupted=pending.some(entry=>entry.target===target&&(!entry.isIntersecting||entry.intersectionRatio<0.5));
      for(const entry of pending)observeEntry(entry);
      return !interrupted&&eligible(target);
    },
    onImpression:(id,placement)=>track('work_impression',{work_id:id,locale:lang,page_type:pageType,placement})
  });
  function observeEntry(entry){
    const card=entry.target.closest('.creation-card');
    if(!card)return;
    const work=JSON.parse(card.dataset.work);
    monitor.update(entry.target,{workId:work.id,placement:entry.target.closest('.related-section')?'related':'card',ratio:entry.isIntersecting&&eligible(entry.target)?entry.intersectionRatio:0});
  }
  observer=new IntersectionObserver(entries=>entries.forEach(observeEntry),{threshold:[0,0.5,1]});
  refreshImpressions=()=>{
    monitor.suspend();
    if(document.visibilityState!=='visible'||dialog?.open)return;
    monitor.resume();
    // Request fresh observations after filtering, tab switches and modal closes.
    for(const target of targets){observer.unobserve(target);observer.observe(target);}
  };
  document.addEventListener('visibilitychange',refreshImpressions);
  window.addEventListener('pagehide',()=>monitor.suspend());
  refreshImpressions();
}
let opener=null;
let selectedVideo='';
function updatePreviewLearning(work,title){
  const panel=dialog?.querySelector('#preview-learning-actions');
  if(!panel)return;
  panel.replaceChildren();panel.hidden=true;
  for(const action of (Array.isArray(work.learningActions)?work.learningActions:[]).slice(0,2)){
    if(!action||!['source','author_guide','learning_note'].includes(action.kind)||typeof action.label!=='string'||!action.label.trim())continue;
    const source=action.kind==='source', external=action.kind!=='learning_note';
    if(external){try{const url=new URL(action.href);if(url.protocol!=='https:'||url.username||url.password||url.port)continue;}catch{continue;}}
    else if(action.href!==`${work.detail}#learning`)continue;
    const provider=['github','huggingface'].includes(action.provider)?action.provider:'other';
    const link=document.createElement('a'),icon=document.createElement('img');
    link.className='resource-action';link.href=action.href;link.setAttribute('aria-label',`${action.ariaLabel||action.label}: ${title}`);
    link.dataset.trackEvent=source?'source_open':'learning_open';link.dataset.trackWork=work.id;
    link.dataset.trackPlacement=source?`source-${provider}-dialog`:`learning-${action.kind==='learning_note'?'note':'guide'}-dialog`;
    if(external){link.target='_blank';link.rel='noopener noreferrer';}
    icon.src=`/assets/icons/${source?(provider==='other'?'code':provider):'book'}.svg`;icon.alt='';icon.width=16;icon.height=16;
    link.append(icon,document.createTextNode(action.label));panel.append(link);
  }
  panel.hidden=!panel.children.length;
}
document.addEventListener('click',event=>{
  const trigger=event.target.closest('[data-preview]');
  if(!trigger||!dialog||typeof dialog.showModal!=='function')return;
  const card=trigger.closest('.creation-card');
  if(!card)return;
  const work=JSON.parse(card.dataset.work);
  updatePreviewLearning({learningActions:[]},'');
  if(!work.poster)return;
  event.preventDefault(); opener=trigger;
  const text=work.locales[lang], img=dialog.querySelector('#preview-image');
  img.hidden=false;dialog.querySelector('#preview-unavailable').hidden=true; img.src=work.poster;img.alt=`${text.title} — ${lang==='zh'?'作品画面':'screenshot'}`;
  selectedVideo=work.video||'';dialog.querySelector('#preview-play').hidden=!selectedVideo;
  dialog.querySelector('#preview-title').textContent=text.title;
  dialog.querySelector('#preview-summary').textContent=text.summary;
  dialog.querySelector('#preview-creator').textContent=work.creator.name||(lang==='zh'?'未确认':'Unconfirmed');
  dialog.querySelector('#preview-open').href=work.demo_url;
  dialog.querySelector('#preview-open').dataset.trackWork=work.id;
  dialog.querySelector('#preview-details').href=work.detail;
  updatePreviewLearning(work,text.title);
  dialog.showModal();refreshImpressions();dialog.querySelector('.dialog-close').focus();
  track('preview_open',{work_id:work.id,locale:lang,page_type:pageType,placement:trigger.closest('.related-section')?'related':'card'});
});
dialog?.querySelector('.dialog-close')?.addEventListener('click',()=>dialog.close());
dialog?.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
dialog?.addEventListener('close',()=>{const video=dialog.querySelector('#preview-video');video.pause();video.removeAttribute('src');video.load();video.hidden=true;updatePreviewLearning({learningActions:[]},'');opener?.focus();opener=null;refreshImpressions();});
dialog?.querySelector('#preview-play')?.addEventListener('click',()=>{if(!selectedVideo)return;const video=dialog.querySelector('#preview-video');dialog.querySelector('#preview-image').hidden=true;dialog.querySelector('#preview-unavailable').hidden=true;video.hidden=false;video.src=selectedVideo;video.play().catch(()=>{});});
dialog?.querySelector('#preview-image')?.addEventListener('error',event=>{event.currentTarget.hidden=true;dialog.querySelector('#preview-unavailable').hidden=false;});
function missingImage(img){
  const fallback=document.createElement('span');fallback.className='image-error';fallback.textContent=lang==='zh'?'暂无实机预览':'Preview unavailable';img.replaceWith(fallback);
}
document.querySelectorAll('.preview-link img').forEach(img=>{img.addEventListener('error',()=>missingImage(img),{once:true});if(img.complete&&!img.naturalWidth)missingImage(img);});
