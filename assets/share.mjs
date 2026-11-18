export function sharePayloadForWork(work){
  if(!work?.shareUrls?.zh||!work?.shareUrls?.en||!work.locales?.zh||!work.locales?.en)return null;
  return {workId:work.id,titleZh:work.locales.zh.title,titleEn:work.locales.en.title,
    summaryZh:work.locales.zh.summary,summaryEn:work.locales.en.summary,
    shareUrlZh:work.shareUrls.zh,shareUrlEn:work.shareUrls.en};
}

function shareData(payload,locale){
  if(!payload||!['zh','en'].includes(locale)||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(payload.workId||''))throw new Error('Invalid share payload');
  const url=locale==='zh'?payload.shareUrlZh:payload.shareUrlEn;
  let parsed;
  try{parsed=new URL(url);}catch{throw new Error('Invalid share URL');}
  const pattern=locale==='zh'?/^\/zh\/[a-z0-9]+(?:-[a-z0-9]+)*\/$/:/^\/[a-z0-9]+(?:-[a-z0-9]+)*\/$/;
  if(parsed.origin!=='https://freemy.ai'||parsed.username||parsed.password||parsed.port||parsed.search||parsed.hash||!pattern.test(parsed.pathname)||parsed.href!==url)throw new Error('Invalid share URL');
  const title=locale==='zh'?payload.titleZh:payload.titleEn;
  const text=locale==='zh'?payload.summaryZh:payload.summaryEn;
  if(typeof title!=='string'||!title.trim()||typeof text!=='string')throw new Error('Invalid share text');
  return {title,text,url};
}

export function xIntentUrl(payload,locale){
  const data=shareData(payload,locale), url=new URL('https://x.com/intent/tweet');
  url.searchParams.set('text',`${data.title} — ${data.text}`);
  url.searchParams.set('url',data.url);
  return url.href;
}

export async function copyValue(value,{copyText}={}){
  try{
    if(typeof copyText!=='function')throw new Error('Clipboard unavailable');
    await copyText(value);
    return {status:'copied',value};
  }catch{return {status:'manual',value};}
}

export function createShareController({copyText,nativeShare,notify=()=>{},track=()=>{}}={}){
  const notice=(...args)=>{try{notify(...args);}catch{}};
  const event=(...args)=>{try{track(...args);}catch{}};
  return {
    async copy(payload,locale){
      const {url}=shareData(payload,locale);
      const result=await copyValue(url,{copyText});
      if(result.status==='copied'){
        notice('copied',url);event('share_copy',{work_id:payload.workId,share_locale:locale});
        return {status:'copied',url};
      }
      notice('manual',url);
      return {status:'manual',url};
    },
    async native(payload,locale){
      if(typeof nativeShare!=='function')return {status:'unsupported'};
      const data=shareData(payload,locale);
      try{
        await nativeShare(data);
        event('share_native_return',{work_id:payload.workId,share_locale:locale});
        return {status:'returned'};
      }catch(error){
        if(error?.name==='AbortError')return {status:'cancelled'};
        notice('native_failed',data.url);return {status:'failed'};
      }
    }
  };
}
