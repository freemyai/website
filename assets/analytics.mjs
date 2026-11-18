const events=new Set(['preview_open','experience_open','related_click','collection_open','work_view','work_impression','source_open','learning_open','share_menu_open','share_copy','share_native_return','share_x_open','share_qr_open','contact_click','contact_copy']);
const safeToken=(value,fallback='unknown')=>typeof value==='string'&&/^[a-z0-9-]{1,80}$/i.test(value)?value:fallback;
const learningPages=new Set(['home','explore','type','topic','collection','work']);
const sourcePlacements=new Set(['github','huggingface','other'].flatMap(provider=>['card','dialog','detail','related'].map(place=>`source-${provider}-${place}`)));
const learningPlacements=new Set(['note','guide'].flatMap(kind=>['card','dialog','detail','related'].map(place=>`learning-${kind}-${place}`)));
const shareEvents=new Set(['share_menu_open','share_copy','share_native_return','share_x_open','share_qr_open']);
const sharePlaces=new Set(['card','dialog','detail','related']);
const shareLanguagePlaces=new Set([...sharePlaces].flatMap(place=>['zh','en'].map(locale=>`${place}-${locale}`)));
const sitePages=new Set([...learningPages,'collectionIndex','about','contact','privacy','submit','notFound']);

// Vercel Pro permits two event properties. Context is a bounded, non-sensitive
// combination of language, page type and placement; raw URLs/searches are excluded.
export function createTracker({enabled=false,origin='',mode='normal',send=()=>{}}={}){
  return (name,fields={})=>{
    if(!enabled||mode==='off'||origin!=='https://freemy.ai'||!events.has(name))return false;
    const locale=['zh','en'].includes(fields.locale)?fields.locale:'unknown';
    const page=safeToken(fields.page_type), placement=safeToken(fields.placement);
    const id=safeToken(fields.work_id,'');
    if((name==='work_view'||name==='work_impression')&&!id)return false;
    if(name==='source_open'||name==='learning_open'){
      const allowed=name==='source_open'?sourcePlacements:learningPlacements;
      if(!id||!['zh','en'].includes(fields.locale)||!learningPages.has(page)||!allowed.has(placement))return false;
    }
    if(shareEvents.has(name)){
      const allowed=['share_copy','share_native_return','share_qr_open'].includes(name)?shareLanguagePlaces:sharePlaces;
      if(!id||!['zh','en'].includes(fields.locale)||!learningPages.has(page)||!allowed.has(placement))return false;
    }
    if(name==='contact_click'||name==='contact_copy'){
      if(!['zh','en'].includes(fields.locale)||!sitePages.has(page))return false;
      if(name==='contact_copy'&&(id||page!=='contact'||placement!=='contact'))return false;
      if(name==='contact_click'){
        const valid=(placement==='footer'&&!id)||(placement==='contact'&&page==='contact'&&!id)||(placement==='submit'&&page==='submit'&&!id)||(placement==='detail'&&page==='work'&&!!id);
        if(!valid)return false;
      }
    }
    const data={...(id?{work_id:id}:{}),placement:`${mode==='qa'?'qa:':''}${locale}:${page}:${placement}`};
    try {send('event',{name,data});return true;} catch {return false;}
  };
}

// A timer is cancelled as soon as the card falls below the threshold, the
// document is hidden, or a modal obscures the gallery. IDs are page-scoped.
export function createImpressionMonitor({onImpression,isStillVisible=()=>true,setTimer=setTimeout,clearTimer=clearTimeout,delay=1000}){
  const states=new Map(), counted=new Set();
  let active=true;
  function cancel(state){if(state.timer!==null){clearTimer(state.timer);state.timer=null;}}
  return {
    update(target,{workId,placement,ratio}){
      let state=states.get(target);
      if(!state){state={timer:null};states.set(target,state);}
      state.workId=workId;state.placement=placement;
      if(!active||!workId||ratio<0.5||counted.has(workId)){cancel(state);return;}
      if(state.timer!==null)return;
      state.timer=setTimer(()=>{
        state.timer=null;
        if(!active||counted.has(state.workId)||!isStillVisible(target))return;
        counted.add(state.workId);
        onImpression(state.workId,state.placement);
      },delay);
    },
    cancel(target){const state=states.get(target);if(state)cancel(state);},
    suspend(){active=false;for(const state of states.values())cancel(state);},
    resume(){active=true;}
  };
}
