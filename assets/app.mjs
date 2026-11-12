import { filterWorks } from './catalog.mjs';

const lang=document.body.dataset.lang||'en';
const grid=document.querySelector('#gallery-grid');
const form=document.querySelector('#gallery-filter');
const sort=document.querySelector('#gallery-sort');
const empty=document.querySelector('#empty-results');
const surprise=document.querySelector('[data-surprise]');
const cards=grid?[...grid.querySelectorAll('.creation-card')].map(card=>({card,work:JSON.parse(card.dataset.work)})):[];
let visible=cards;

function update(){
  const q=form?.elements.namedItem('q')?.value||'';
  const matches=new Set(filterWorks(cards.map(item=>item.work),{q}).map(w=>w.id));
  visible=cards.filter(item=>matches.has(item.work.id));
  const ordered=[...cards].sort((a,b)=>sort?.value==='recent'?(b.work.added_at||'').localeCompare(a.work.added_at||'')||b.work.sequence-a.work.sequence:a.work.order-b.work.order);
  for(const item of ordered){item.card.hidden=!matches.has(item.work.id);grid.append(item.card);}
  if(empty) empty.hidden=visible.length>0;
  if(surprise) surprise.setAttribute('aria-disabled',String(!visible.length));
  if(form){const next=new URL(location.href);if(q)next.searchParams.set('q',q);else next.searchParams.delete('q');history.replaceState(null,'',next);}
}
if(form&&grid){
  form.elements.namedItem('q').value=new URLSearchParams(location.search).get('q')||'';
  form.addEventListener('input',update);
  form.addEventListener('submit',event=>{event.preventDefault();update();});
  sort?.addEventListener('change',update);
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

const dialog=document.querySelector('#preview-dialog');
let opener=null;
let selectedVideo='';
document.addEventListener('click',event=>{
  const trigger=event.target.closest('[data-preview]');
  if(!trigger||!dialog||typeof dialog.showModal!=='function')return;
  const card=trigger.closest('.creation-card');
  if(!card)return;
  const work=JSON.parse(card.dataset.work);
  if(!work.poster)return;
  event.preventDefault(); opener=trigger;
  const text=work.locales[lang], img=dialog.querySelector('#preview-image');
  img.hidden=false;dialog.querySelector('#preview-unavailable').hidden=true; img.src=work.poster;img.alt=`${text.title} — ${lang==='zh'?'作品画面':'screenshot'}`;
  selectedVideo=work.video||'';dialog.querySelector('#preview-play').hidden=!selectedVideo;
  dialog.querySelector('#preview-title').textContent=text.title;
  dialog.querySelector('#preview-summary').textContent=text.summary;
  dialog.querySelector('#preview-creator').textContent=work.creator.name||(lang==='zh'?'未确认':'Unconfirmed');
  dialog.querySelector('#preview-open').href=work.demo_url;
  dialog.querySelector('#preview-details').href=work.detail;
  dialog.showModal();dialog.querySelector('.dialog-close').focus();
});
dialog?.querySelector('.dialog-close')?.addEventListener('click',()=>dialog.close());
dialog?.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
dialog?.addEventListener('close',()=>{const video=dialog.querySelector('#preview-video');video.pause();video.removeAttribute('src');video.load();video.hidden=true;opener?.focus();opener=null;});
dialog?.querySelector('#preview-play')?.addEventListener('click',()=>{if(!selectedVideo)return;const video=dialog.querySelector('#preview-video');dialog.querySelector('#preview-image').hidden=true;dialog.querySelector('#preview-unavailable').hidden=true;video.hidden=false;video.src=selectedVideo;video.play().catch(()=>{});});
dialog?.querySelector('#preview-image')?.addEventListener('error',event=>{event.currentTarget.hidden=true;dialog.querySelector('#preview-unavailable').hidden=false;});
function missingImage(img){
  const fallback=document.createElement('span');fallback.className='image-error';fallback.textContent=lang==='zh'?'暂无实机预览':'Preview unavailable';img.replaceWith(fallback);
}
document.querySelectorAll('.preview-link img').forEach(img=>{img.addEventListener('error',()=>missingImage(img),{once:true});if(img.complete&&!img.naturalWidth)missingImage(img);});
