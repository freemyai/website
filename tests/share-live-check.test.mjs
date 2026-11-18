import test from 'node:test';
import assert from 'node:assert/strict';

const audit=await import('../scripts/check-share-live.mjs').catch(error=>{
  if(error.code==='ERR_MODULE_NOT_FOUND')return {};
  throw error;
});

test('live checks reject off-site redirects and distinguish a genuine missing path',async()=>{
  assert.equal(typeof audit.checkLiveShare,'function','live share checker must exist');
  const fake=async url=>{
    const u=new URL(url), routes={'/hydraulics/':'/en/works/hydraulics/','/zh/hydraulics/':'/works/hydraulics/','/tree-appreciator/':'/en/works/tree-appreciator/','/zh/tree-appreciator/':'/works/tree-appreciator/','/en/':'/'};
    if(routes[u.pathname])return new Response(null,{status:308,headers:{location:routes[u.pathname]}});
    if(routes[`${u.pathname}/`])return new Response(null,{status:308,headers:{location:`${u.pathname}/`}});
    if(u.pathname==='/__freemy-share-missing__/')return new Response(null,{status:404});
    if(u.pathname.startsWith('/api/insights'))return new Response(null,{status:401});
    const en=u.pathname.startsWith('/en/'),work=u.pathname.match(/\/works\/([^/]+)\//)?.[1];
    const body=`<html lang="${en?'en':'zh-CN'}"><head><link rel="canonical" href="https://freemy.ai${u.pathname}"><meta property="og:url" content="https://freemy.ai${u.pathname}"></head><body ${work?`data-detail-work="${work}"`:''}>${work||'ai@freemy.ai'}</body></html>`;
    return new Response(body,{status:200});
  };
  const result=await audit.checkLiveShare({origin:'https://freemy.ai',fetchImpl:fake});
  assert.deepEqual(result.errors,[]);
  const malicious=async(url,options)=>new URL(url).pathname==='/hydraulics/'?new Response(null,{status:308,headers:{location:'https://evil.example/'}}):fake(url,options);
  assert.ok((await audit.checkLiveShare({origin:'https://freemy.ai',fetchImpl:malicious})).errors.some(error=>/hydraulics/.test(error)));
  const soft404=async(url,options)=>new URL(url).pathname==='/__freemy-share-missing__/'?new Response('homepage',{status:200}):fake(url,options);
  assert.ok((await audit.checkLiveShare({origin:'https://freemy.ai',fetchImpl:soft404})).errors.some(error=>/404/.test(error)));
  const missingTree=async(url,options)=>new URL(url).pathname.includes('/works/tree-appreciator/')?new Response(null,{status:404}):fake(url,options);
  assert.ok((await audit.checkLiveShare({origin:'https://freemy.ai',fetchImpl:missingTree})).errors.some(error=>/tree-appreciator/.test(error)));
  const brokenNoSlash=async(url,options)=>new URL(url).pathname==='/hydraulics'?new Response(null,{status:500}):fake(url,options);
  assert.ok((await audit.checkLiveShare({origin:'https://freemy.ai',fetchImpl:brokenNoSlash})).errors.some(error=>/hydraulics/.test(error)));
  const emptyPage=async(url,options)=>new URL(url).pathname==='/en/works/hydraulics/'?new Response('<html>ok</html>',{status:200}):fake(url,options);
  assert.ok((await audit.checkLiveShare({origin:'https://freemy.ai',fetchImpl:emptyPage})).errors.some(error=>/hydraulics/.test(error)));
});
