import { escapeHtml as e, hasAiEvidence, safeExternalUrl } from './catalog.mjs';
import { messages, topicNames, urlFor, langName, creatorName } from './i18n.mjs';
import { layout, image, galleryGrid, controls, typeTabs, collectionCard } from './components.mjs';

export function home(lang,c){
  const m=messages[lang];
  const body=`<section class="wrap home-intro"><div><p class="eyebrow">${e(m.brand)}</p><h1>${e(m.hero)}</h1><p>${e(m.intro)}</p></div><div class="intro-note"><span>${lang==='zh'?'发现下一份灵感':'YOUR NEXT DISCOVERY'}</span><b>↘</b></div></section><section class="wrap gallery-section"><div class="gallery-topline"><div><span class="section-number">01 /</span><h2>${e(m.explore)}</h2></div><span class="gallery-caption">${lang==='zh'?'看见作品，打开想象':'A GALLERY FOR CURIOUS MINDS'}</span></div>${typeTabs(c.types,lang)}${controls(lang)}${galleryGrid(c.gallery,lang)}</section><section class="wrap collections-section"><div class="section-heading"><div><span class="section-number">02 /</span><h2>${e(m.collections)}</h2></div><a href="${e(urlFor(lang,'/collections/'))}">${e(m.viewAll)} ↗</a></div><div class="collections-grid">${c.collections.slice(0,2).map(x=>collectionCard(x,lang,c.works)).join('')}</div></section><section class="wrap creator-section"><div><p class="eyebrow">FOR CREATORS</p><h2>${e(m.creatorCta)}</h2><p>${e(m.creatorText)}</p></div><a class="button button-dark" href="${e(urlFor(lang,'/submit/'))}">${e(m.submit)} ↗</a></section>`;
  return layout({lang,body});
}

export function explore(lang,c,type=null){
  const m=messages[lang], list=type?c.gallery.filter(w=>w.type===type.id):c.gallery;
  const name=type?type[lang]:m.explore, route=type?`/types/${type.id}/`:'/explore/';
  return layout({lang,path:route,title:name,description:m.intro,body:`<section class="wrap listing-intro"><p class="eyebrow">FREEMY / ${e(type?type.id.toUpperCase():'EXPLORE')}</p><h1>${e(name)}</h1><p>${e(m.intro)}</p></section><section class="wrap gallery-section listing-section">${typeTabs(c.types,lang,type?.id||'')}${controls(lang,route,list[0]?.slug||'hydraulics')}${galleryGrid(list,lang)}</section>`});
}

export function collectionsPage(lang,c){const m=messages[lang];return layout({lang,path:'/collections/',title:m.collections,body:`<section class="wrap listing-intro"><p class="eyebrow">FREEMY / COLLECTIONS</p><h1>${e(m.collections)}</h1><p>${e(m.collectionIntro)}</p></section><section class="wrap collection-list"><div class="collections-grid">${c.collections.map(x=>collectionCard(x,lang,c.works)).join('')}</div></section>`});}

export function collectionPage(lang,c,collection){
  const m=messages[lang], list=collection.works.map(id=>c.works.find(w=>w.id===id)).filter(w=>w&&w.editorial?.status==='published'&&w.verification?.availability!=='unavailable'), text=collection[lang], path=`/collections/${collection.id}/`;
  return layout({lang,path,title:text.title,description:text.summary,body:`<section class="wrap listing-intro"><p class="eyebrow">FREEMY / COLLECTION</p><h1>${e(text.title)}</h1><p>${e(text.summary)}</p></section><section class="wrap gallery-section listing-section">${collection.id==='inspiration'?`<p class="reference-note">${e(m.inspirationNote)}</p>`:''}${galleryGrid(list,lang)}</section>`});
}

function access(w,lang){
  const login={none:['无需登录','No sign-in'],optional:['可选登录','Optional sign-in'],required:['需要登录','Sign-in required'],unknown:['未知','Unknown']};
  const pricing={free:['免费','Free'],freemium:['部分免费','Freemium'],paid:['付费','Paid'],unknown:['未知','Unknown']};
  const n=lang==='zh'?0:1;return `${(login[w.access?.login]||login.unknown)[n]} / ${(pricing[w.access?.pricing]||pricing.unknown)[n]}`;
}
function devices(w,lang){
  const values={tested_supported:['已测试','Tested'],reported_supported:['原站称支持','Creator reports support'],tested_unsupported:['测试不支持','Not supported in test'],unknown:['未知','Unknown']}, n=lang==='zh'?0:1;
  const desktop=(values[w.device_support?.desktop]||values.unknown)[n], mobile=(values[w.device_support?.mobile]||values.unknown)[n];
  return lang==='zh'?`桌面：${desktop}；手机：${mobile}`:`Desktop: ${desktop}; mobile: ${mobile}`;
}

export function detail(lang,c,w){
  const m=messages[lang], l=w.locales[lang], path=`/works/${w.slug}/`, ai=hasAiEvidence(w);
  const creator=creatorName(w,lang)||m.unknown, profile=safeExternalUrl(w.creator?.profile_url);
  const status=w.verification?.level==='interaction_tested'?m.statusTested:w.verification?.level==='page_rendered'?m.statusRendered:m.statusFetched;
  const note=lang==='zh'?(w.verification?.note||status):(w.verification?.note_en||status);
  const tools=(w.ai_provenance?.tools||[]).join(', ');
  const aiText=ai ? `${m.aiClaim}${tools?(lang==='zh'?` 使用工具：${tools}。`:` Tools: ${tools}.`):''}` : m.aiUnknown;
  const languages=(w.access?.language_codes||[]).map(code=>langName(code,lang)).join(' / ')||m.unknownValue;
  const original=safeExternalUrl(w.demo_url), evidence=safeExternalUrl(w.ai_provenance?.evidence_url);
  const sourceLinks=(w.sources||[]).filter(x=>safeExternalUrl(x.url)).map(x=>`<a href="${e(safeExternalUrl(x.url))}" target="_blank" rel="noopener noreferrer">${lang==='zh'?'作品来源':'Original source'} ↗</a>`).join('');
  const related=c.gallery.filter(x=>x.id!==w.id).slice(0,3);
  return layout({lang,path,title:l.title,description:l.summary,imageUrl:w.media?.poster?.src||'/media/hydraulics-960.webp',body:`<div class="wrap detail-wrap"><nav class="breadcrumbs" aria-label="${lang==='zh'?'面包屑':'Breadcrumb'}"><a href="${e(urlFor(lang,'/explore/'))}">${e(m.explore)}</a><span>/</span><span>${e(l.title)}</span></nav><section class="detail-top"><div class="detail-visual">${image(w,lang,true)}</div><div class="detail-heading"><p class="eyebrow">${e(c.types.find(t=>t.id===w.type)?.[lang]||'')} ${ai?'':'· '+e(m.inspiration)}</p><h1>${e(l.title)}</h1><p class="detail-summary">${e(l.summary)}</p><p class="detail-by">${e(m.by)} ${profile?`<a href="${e(profile)}" target="_blank" rel="noopener noreferrer">${e(creator)} ↗</a>`:e(creator)}</p><a class="button button-dark detail-open" href="${e(original)}" target="_blank" rel="noopener noreferrer">${e(m.open)} ↗</a><small>${e(m.onOriginal)}</small></div></section><div class="detail-body"><div class="detail-story"><section><p class="eyebrow">01 / ${lang==='zh'?'开始体验':'GET STARTED'}</p><h2>${e(m.how)}</h2><p>${e(l.action)}</p></section><section><p class="eyebrow">02 / ${lang==='zh'?'作品介绍':'ABOUT THE CREATION'}</p><h2>${e(m.why)}</h2><p>${e(l.why)}</p></section><section><p class="eyebrow">03 / ${lang==='zh'?'了解更多':'MORE TO KNOW'}</p><h2>${e(m.limits)}</h2><p>${e(l.limit)}</p></section></div><aside class="detail-facts"><h2>${e(m.sources)}</h2><dl><div><dt>${e(m.original)}</dt><dd>${e(w.title_original)}</dd></div><div><dt>${e(m.originLang)}</dt><dd>${e(languages)}</dd></div><div><dt>${e(m.login)}</dt><dd>${e(access(w,lang))}</dd></div><div><dt>${e(m.device)}</dt><dd>${e(devices(w,lang))}</dd></div><div><dt>${e(m.checked)}</dt><dd>${e(w.verification?.last_checked_at||m.unknownValue)}</dd></div></dl><p class="verification">${e(note)}</p><h3>${e(m.ai)}</h3><p>${e(aiText)}</p>${evidence?`<a href="${e(evidence)}" target="_blank" rel="noopener noreferrer">${e(m.verified)} ↗</a>`:''}${sourceLinks}</aside></div></div><section class="wrap related-section"><div class="section-heading"><div><span class="section-number">↗</span><h2>${e(m.otherWorks)}</h2></div><a href="${e(urlFor(lang,'/explore/'))}">${e(m.viewAll)} ↗</a></div>${galleryGrid(related,lang)}</section>`});
}

export function topicPage(lang,c,topic){
  const m=messages[lang], name=topicNames[topic.id]?.[lang==='zh'?0:1]||topic.id, list=c.works.filter(w=>w.primary_category===topic.id&&w.editorial?.status==='published'&&w.verification?.availability!=='unavailable');
  const note=lang==='zh'?'这个主题包含 AI 作品，以及创作方式尚未确认的灵感参考。':'This topic includes AI creations and references with unconfirmed origins.';
  return layout({lang,path:`/categories/${topic.id}/`,title:name,body:`<section class="wrap listing-intro"><p class="eyebrow">FREEMY / TOPIC</p><h1>${e(name)}</h1><p>${e(note)}</p></section><section class="wrap gallery-section listing-section">${galleryGrid(list,lang)}</section>`});
}

export function about(lang){const m=messages[lang];return layout({lang,path:'/about/',title:m.about,body:`<section class="wrap prose-page"><p class="eyebrow">ABOUT FREEMY</p><h1>${e(m.aboutIntro)}</h1><p>${e(m.aboutText)}</p><p>${e(m.footerNote)}</p><a class="button button-dark" href="${e(urlFor(lang,'/explore/'))}">${e(m.explore)} ↗</a></section>`});}
export function privacy(lang){
  const m=messages[lang], text=lang==='zh'?'Freemy 不要求注册，也没有主动加入访问分析脚本。语言选择会保存在浏览器本地。网站由 Vercel 提供服务，访问可能产生基本服务日志。点击作品或提交入口后，你会进入第三方网站；这些网站的隐私做法以其自身说明为准。':'Freemy does not require an account or add analytics scripts. Your language choice is stored locally in your browser. The site is hosted by Vercel, which may create basic service logs. Creation and submission links open third-party websites, whose own privacy practices apply.';
  return layout({lang,path:'/privacy/',title:m.privacy,body:`<section class="wrap prose-page"><p class="eyebrow">FREEMY / PRIVACY</p><h1>${e(m.privacy)}</h1><p>${e(text)}</p></section>`});
}
export function submit(lang){
  const m=messages[lang], title=lang==='zh'?'推荐作品 / Creation submission':'Creation submission', content=lang==='zh'?'作品名称：\n体验网址：\n创作者：\n作品简介：\nAI 如何参与：\n相关来源：':'Creation name:\nExperience URL:\nCreator:\nDescription:\nHow AI was involved:\nSources:';
  const issue=`https://github.com/freemyai/website/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(content)}`;
  return layout({lang,path:'/submit/',title:m.submit,body:`<section class="wrap prose-page"><p class="eyebrow">FOR CREATORS</p><h1>${e(m.submitIntro)}</h1><p>${e(m.submitText)}</p><a class="button button-dark" href="${e(issue)}" target="_blank" rel="noopener noreferrer">${e(m.submitButton)} ↗</a><p class="small-note">${e(m.submitNote)}</p></section>`});
}
export function notFound(lang){const m=messages[lang];return layout({lang,path:'/404/',title:'404',noindex:true,body:`<section class="wrap prose-page"><p class="eyebrow">404</p><h1>${e(m.notFound)}</h1><a class="button button-dark" href="${e(urlFor(lang,'/explore/'))}">${e(m.back)} ↗</a></section>`});}
export function fallbackNotFound(){return layout({lang:'zh',path:'/404/',title:'404',noindex:true,body:`<section class="wrap prose-page"><p class="eyebrow">404</p><h1>${e(messages.zh.notFound)}</h1><p lang="en">${e(messages.en.notFound)}</p><div class="dialog-actions"><a class="button button-dark" href="/explore/">${e(messages.zh.back)} ↗</a><a class="button button-light" href="/en/explore/" lang="en">${e(messages.en.back)} ↗</a></div></section>`});}
