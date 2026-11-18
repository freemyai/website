export function sortFromSearch(search){
  return new URLSearchParams(search).get('sort')==='recent'?'recent':'featured';
}

export function filterUrl(href,{q='',openSource=false,learningNote=false,sort='featured'}={}){
  const url=new URL(href);
  if(q)url.searchParams.set('q',q);else url.searchParams.delete('q');
  for(const [key,enabled] of [['open_source',openSource],['learning_note',learningNote]]){
    if(enabled)url.searchParams.set(key,'1');else url.searchParams.delete(key);
  }
  if(sort==='recent')url.searchParams.set('sort','recent');else url.searchParams.delete('sort');
  return url;
}

function scrollKey(href,origin){
  try{
    const url=new URL(href);
    const allowed=['/','/zh/','/explore/','/en/explore/'].includes(url.pathname)||/^\/(?:en\/)?types\/[a-z0-9]+(?:-[a-z0-9]+)*\/$/.test(url.pathname);
    return url.origin===origin&&allowed?`freemy:list-scroll:${url.pathname}${url.search}`:null;
  }catch{return null;}
}

export function withListScroll(state,href,origin,y,now=Date.now()){
  const key=scrollKey(href,origin);
  if(!key||!Number.isFinite(y)||y<0||!Number.isFinite(now))return null;
  if(state!==null&&(typeof state!=='object'||Array.isArray(state)||Object.getPrototypeOf(state)!==Object.prototype))return null;
  return {...state,__freemyListScroll:{key,y,at:now}};
}

export function readListScroll(state,href,origin,now=Date.now()){
  const key=scrollKey(href,origin);if(!key)return null;
  try{
    const saved=state?.__freemyListScroll;
    return saved?.key===key&&Number.isFinite(saved.y)&&saved.y>=0&&Number.isFinite(saved.at)&&now>=saved.at&&now-saved.at<=30*60*1000?saved.y:null;
  }catch{return null;}
}
