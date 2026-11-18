import { filterWorks } from './catalog.mjs';
import { createTracker, createImpressionMonitor } from './analytics.mjs';
import { createShareController, sharePayloadForWork, xIntentUrl, copyValue } from './share.mjs';
import { filterUrl, sortFromSearch, saveListScroll, takeListScroll } from './navigation-state.mjs';

const lang=document.body.dataset.lang||'en';
const pageType=document.body.dataset.pageType||'unknown';
const analyticsEnabled=document.body.dataset.analyticsEnabled==='true';
const track=createTracker({enabled:analyticsEnabled,origin:location.origin,mode:window.__freemyAnalyticsMode,send:(...args)=>window.va?.(...args)});
const dialog=document.querySelector('#preview-dialog');
const detail=document.querySelector('[data-detail-work]');
const shareControls=[...document.querySelectorAll('[data-share-control]')];
function closeShare(control,{focus=false}={}){
  const panel=control.querySelector('[data-share-panel]'),button=control.querySelector('[data-share-toggle]');
  panel.hidden=true;button.setAttribute('aria-expanded','false');
  control.querySelector('[data-share-manual]').hidden=true;control.querySelector('[data-share-status]').textContent='';
  control.querySelector('[data-share-qr-view]').hidden=true;control._qrRequest=(control._qrRequest||0)+1;
  if(focus)button.focus();
}
async function showShareQr(control,payload,locale,report){
  const request=control._qrRequest=(control._qrRequest||0)+1;
  try{
    const {drawQr}=await import('./share-qr.mjs');
    if(control.hidden||control.querySelector('[data-share-panel]').hidden||control._qrRequest!==request)return;
    const view=control.querySelector('[data-share-qr-view]'),canvas=view.querySelector('canvas');
    drawQr(canvas,locale==='zh'?payload.shareUrlZh:payload.shareUrlEn);
    view.querySelectorAll('[data-qr-locale]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.qrLocale===locale)));
    view.hidden=false;report('share_qr_open',{share_locale:locale});
  }catch{
    control.querySelector('[data-share-status]').textContent=lang==='zh'?'二维码暂不可用，请复制链接。':'QR code unavailable. Please copy the link.';
  }
}
function setSharePayload(control,payload){
  closeShare(control);control.dataset.sharePayload=payload?JSON.stringify(payload):'';
  control.hidden=!payload;
  if(payload)control.querySelector('[data-share-x]').href=xIntentUrl(payload,lang);
}
for(const control of shareControls){
  const payload=control.dataset.sharePayload;
  control.hidden=!payload;
  control.querySelector('[data-share-native]').hidden=typeof navigator.share!=='function';
}
document.addEventListener('click',event=>{
  const control=event.target.closest('[data-share-control]');
  for(const item of shareControls)if(item!==control&&!item.querySelector('[data-share-panel]').hidden)closeShare(item);
  if(!control||control.hidden)return;
  const button=event.target.closest('[data-share-toggle]'),panel=control.querySelector('[data-share-panel]');
  let payload;try{payload=JSON.parse(control.dataset.sharePayload);}catch{return;}
  const placement=control.dataset.sharePlacement;
  const report=(name,fields={})=>track(name,{work_id:payload.workId,locale:lang,page_type:pageType,placement:fields.share_locale?`${placement}-${fields.share_locale}`:placement});
  if(button){
    const opening=panel.hidden;panel.hidden=!opening;button.setAttribute('aria-expanded',String(opening));
    if(opening)report('share_menu_open');else closeShare(control);
    return;
  }
  const copy=event.target.closest('[data-share-copy]'),native=event.target.closest('[data-share-native]'),x=event.target.closest('[data-share-x]'),qr=event.target.closest('[data-share-qr]'),qrLocale=event.target.closest('[data-qr-locale]');
  if(x){report('share_x_open');return;}
  if(qr||qrLocale){showShareQr(control,payload,qrLocale?.dataset.qrLocale||lang,report);return;}
  if(!copy&&!native)return;
  const controller=createShareController({
    copyText:typeof navigator.clipboard?.writeText==='function'?navigator.clipboard.writeText.bind(navigator.clipboard):undefined,
    nativeShare:typeof navigator.share==='function'?navigator.share.bind(navigator):undefined,
    track:report,
    notify:(state,url)=>{
      const status=control.querySelector('[data-share-status]'), manual=control.querySelector('[data-share-manual]');
      manual.hidden=state!=='manual';
      status.textContent=state==='copied'?(lang==='zh'?'已复制链接':'Link copied'):state==='native_failed'?(lang==='zh'?'无法打开系统分享，请复制链接。':'Could not open device sharing. Please copy the link.'):(lang==='zh'?'请手动复制链接。':'Please copy the link manually.');
      if(state==='manual'){const input=manual.querySelector('input');input.value=url;input.focus();input.select();}
    }
  });
  if(copy)controller.copy(payload,copy.dataset.shareCopy);
  else controller.native(payload,lang);
});
document.addEventListener('keydown',event=>{
  if(event.key!=='Escape')return;
  const open=shareControls.find(item=>!item.querySelector('[data-share-panel]').hidden);
  if(open){event.preventDefault();event.stopPropagation();closeShare(open,{focus:true});}
});
document.querySelectorAll('[data-contact-copy]').forEach(button=>{
  button.hidden=false;
  button.addEventListener('click',async()=>{
    const copyText=typeof navigator.clipboard?.writeText==='function'?navigator.clipboard.writeText.bind(navigator.clipboard):undefined;
    const result=await copyValue(button.dataset.contactEmail,{copyText});
    const area=button.closest('.contact-page'),manual=area.querySelector('[data-contact-manual]'),status=area.querySelector('[data-contact-status]');
    manual.hidden=result.status!=='manual';
    status.textContent=result.status==='copied'?(lang==='zh'?'已复制邮箱':'Email copied'):(lang==='zh'?'请手动复制邮箱。':'Please copy the email address manually.');
    if(result.status==='copied')track('contact_copy',{locale:lang,page_type:pageType,placement:'contact'});
    else{const input=manual.querySelector('input');input.focus();input.select();}
  });
});
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
  if(form){const next=filterUrl(location.href,{q,openSource:!!sourceFilter?.checked,learningNote:!!noteFilter?.checked,sort:sort?.value});history.replaceState(history.state,'',next);}
}
if(form&&grid){
  document.querySelector('.resource-filters')?.removeAttribute('hidden');
  const query=new URLSearchParams(location.search);
  form.elements.namedItem('q').value=query.get('q')||'';
  if(sourceFilter)sourceFilter.checked=query.get('open_source')==='1';
  if(noteFilter)noteFilter.checked=query.get('learning_note')==='1';
  if(sort)sort.value=sortFromSearch(location.search);
  form.addEventListener('input',update);
  form.addEventListener('submit',event=>{event.preventDefault();update();});
  sort?.addEventListener('change',update);
  sourceFilter?.addEventListener('change',update);
  noteFilter?.addEventListener('change',update);
  update();
  window.addEventListener('pagehide',()=>{try{saveListScroll(sessionStorage,location.href,location.origin,scrollY);}catch{}});
  window.addEventListener('pageshow',event=>{
    const back=event.persisted||performance.getEntriesByType('navigation')[0]?.type==='back_forward';
    if(!back)return;
    let y=null;try{y=takeListScroll(sessionStorage,location.href,location.origin);}catch{}
    if(y!==null)requestAnimationFrame(()=>requestAnimationFrame(()=>window.scrollTo(0,y)));
  });
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
  setSharePayload(dialog.querySelector('[data-share-control]'),sharePayloadForWork(work));
  updatePreviewLearning(work,text.title);
  dialog.showModal();refreshImpressions();dialog.querySelector('.dialog-close').focus();
  track('preview_open',{work_id:work.id,locale:lang,page_type:pageType,placement:trigger.closest('.related-section')?'related':'card'});
});
dialog?.querySelector('.dialog-close')?.addEventListener('click',()=>dialog.close());
dialog?.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
dialog?.addEventListener('close',()=>{const video=dialog.querySelector('#preview-video');video.pause();video.removeAttribute('src');video.load();video.hidden=true;updatePreviewLearning({learningActions:[]},'');setSharePayload(dialog.querySelector('[data-share-control]'),null);opener?.focus();opener=null;refreshImpressions();});
dialog?.querySelector('#preview-play')?.addEventListener('click',()=>{if(!selectedVideo)return;const video=dialog.querySelector('#preview-video');dialog.querySelector('#preview-image').hidden=true;dialog.querySelector('#preview-unavailable').hidden=true;video.hidden=false;video.src=selectedVideo;video.play().catch(()=>{});});
dialog?.querySelector('#preview-image')?.addEventListener('error',event=>{event.currentTarget.hidden=true;dialog.querySelector('#preview-unavailable').hidden=false;});
function missingImage(img){
  const fallback=document.createElement('span');fallback.className='image-error';fallback.textContent=lang==='zh'?'暂无实机预览':'Preview unavailable';img.replaceWith(fallback);
}
document.querySelectorAll('.preview-link img').forEach(img=>{img.addEventListener('error',()=>missingImage(img),{once:true});if(img.complete&&!img.naturalWidth)missingImage(img);});
