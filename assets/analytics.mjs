const events=new Set(['preview_open','experience_open','related_click','collection_open']);
const safeToken=(value,fallback='unknown')=>typeof value==='string'&&/^[a-z0-9-]{1,80}$/i.test(value)?value:fallback;

// Vercel Pro permits two event properties. Context is a bounded, non-sensitive
// combination of language, page type and placement; raw URLs/searches are excluded.
export function createTracker({enabled=false,origin='',send=()=>{}}={}){
  return (name,fields={})=>{
    if(!enabled||origin!=='https://freemy.ai'||!events.has(name))return false;
    const locale=['zh','en'].includes(fields.locale)?fields.locale:'unknown';
    const page=safeToken(fields.page_type), placement=safeToken(fields.placement);
    const id=safeToken(fields.work_id,'');
    const data={...(id?{work_id:id}:{}),placement:`${locale}:${page}:${placement}`};
    try {send('event',{name,data});return true;} catch {return false;}
  };
}
