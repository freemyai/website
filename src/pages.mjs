import { escapeHtml as e, hasAiEvidence, safeExternalUrl } from './catalog.mjs';
import { messages, topicNames, urlFor, langName, creatorName } from './i18n.mjs';
import { layout, image, galleryGrid, controls, typeTabs, collectionCard } from './components.mjs';
import { breadcrumbsFor, listedWorks } from './structured-data.mjs';
import { selectRelatedWorks, collectionsForWork } from './related.mjs';

function breadcrumbs(page,c){
  const items=breadcrumbsFor(page,c);
  if(!items.length)return '';
  return `<nav class="breadcrumbs" aria-label="${page.locale==='zh'?'面包屑':'Breadcrumb'}">${items.map((item,i)=>`${i?'<span aria-hidden="true">/</span>':''}${i===items.length-1?`<span aria-current="page">${e(item.name)}</span>`:`<a href="${e(item.path)}">${e(item.name)}</a>`}`).join('')}</nav>`;
}

export function home(lang,c,seo){
  const m=messages[lang];
  const body=`<section class="wrap home-intro"><div><p class="eyebrow">${e(m.brand)}</p><h1>${e(m.hero)}</h1><p>${e(m.intro)}</p></div><div class="intro-note"><span>${lang==='zh'?'发现下一份灵感':'YOUR NEXT DISCOVERY'}</span><b>↘</b></div></section><section class="wrap gallery-section"><div class="gallery-topline"><div><span class="section-number">01 /</span><h2>${e(m.explore)}</h2></div><span class="gallery-caption">${lang==='zh'?'看见作品，打开想象':'A GALLERY FOR CURIOUS MINDS'}</span></div>${typeTabs(c.types,lang)}${controls(lang)}${galleryGrid(c.gallery,lang)}</section><section class="wrap collections-section"><div class="section-heading"><div><span class="section-number">02 /</span><h2>${e(m.collections)}</h2></div><a href="${e(urlFor(lang,'/collections/'))}">${e(m.viewAll)} ↗</a></div><div class="collections-grid">${c.collections.slice(0,2).map(x=>collectionCard(x,lang,c.works)).join('')}</div></section><section class="wrap creator-section"><div><p class="eyebrow">FOR CREATORS</p><h2>${e(m.creatorCta)}</h2><p>${e(m.creatorText)}</p></div><a class="button button-dark" href="${e(urlFor(lang,'/submit/'))}">${e(m.submit)} ↗</a></section>`;
  return layout({lang,body,seo});
}

export function explore(lang,c,type,seo,page){
  const m=messages[lang], list=listedWorks(page,c), name=type?type[lang]:m.explore;
  const route=type?`/types/${type.id}/`:'/explore/', intro=type?.intro?.[lang]||m.intro;
  return layout({lang,path:route,seo,body:`<section class="wrap listing-intro">${breadcrumbs(page,c)}<p class="eyebrow">FREEMY / ${e(type?type.id.toUpperCase():'EXPLORE')}</p><h1>${e(name)}</h1><p>${e(intro)}</p></section><section class="wrap gallery-section listing-section">${typeTabs(c.types,lang,type?.id||'')}${controls(lang,route,list[0]?.slug||'hydraulics')}${galleryGrid(list,lang)}</section>`});
}

export function collectionsPage(lang,c,seo,page){
  const m=messages[lang];
  return layout({lang,path:'/collections/',seo,body:`<section class="wrap listing-intro">${breadcrumbs(page,c)}<p class="eyebrow">FREEMY / COLLECTIONS</p><h1>${e(m.collections)}</h1><p>${e(m.collectionIntro)}</p></section><section class="wrap collection-list"><div class="collections-grid">${c.collections.map((x,i)=>collectionCard(x,lang,c.works,{priority:i===0?'lcp':'lazy'})).join('')}</div></section>`});
}

export function collectionPage(lang,c,collection,seo,page){
  const m=messages[lang], list=listedWorks(page,c), text=collection[lang], route=`/collections/${collection.id}/`;
  const notes=Object.entries(text.work_notes||{}).map(([id,note])=>{const work=list.find(x=>x.id===id);return work?`<li><a href="${e(urlFor(lang,`/works/${work.slug}/`))}">${e(work.locales[lang].title)}</a> — ${e(note)}</li>`:'';}).join('');
  const related=(collection.related_collections||[]).map(id=>c.collections.find(x=>x.id===id)).filter(Boolean);
  return layout({lang,path:route,seo,body:`<section class="wrap listing-intro">${breadcrumbs(page,c)}<p class="eyebrow">FREEMY / COLLECTION</p><h1>${e(text.title)}</h1><p>${e(text.summary)}</p>${(text.intro||[]).map(p=>`<p>${e(p)}</p>`).join('')}${text.selection_notes?.[0]?`<p>${e(text.selection_notes[0])}</p>`:''}</section><section class="wrap gallery-section listing-section">${collection.id==='inspiration'?`<p class="reference-note">${e(m.inspirationNote)}</p>`:''}${galleryGrid(list,lang)}</section>${notes?`<section class="wrap collection-notes"><h2>${lang==='zh'?'如何选择':'Choose what to explore'}</h2>${(text.selection_notes||[]).slice(1).map(p=>`<p>${e(p)}</p>`).join('')}<ul>${notes}</ul></section>`:''}${related.length?`<section class="wrap collection-notes"><h2>${lang==='zh'?'相关合集':'Related collections'}</h2><p>${related.map(x=>`<a href="${e(urlFor(lang,`/collections/${x.id}/`))}" data-track-event="collection_open" data-track-placement="collection-${e(x.id)}">${e(x[lang].title)}</a>`).join(' · ')}</p></section>`:''}`});
}

function access(w,lang){
  const login={none:['无需登录','No sign-in'],optional:['可选登录','Optional sign-in'],required:['需要登录','Sign-in required'],unknown:['未知','Unknown']};
  const pricing={free:['免费','Free'],freemium:['部分免费','Freemium'],paid:['付费','Paid'],unknown:['未知','Unknown']};
  const n=lang==='zh'?0:1;return `${(login[w.access?.login]||login.unknown)[n]} / ${(pricing[w.access?.pricing]||pricing.unknown)[n]}`;
}
function devices(w,lang){
  const values={tested_supported:['已测试','Tested'],reported_supported:['原站称支持','Creator reports support'],reported_unsupported:['原站称不支持','Creator reports unsupported'],tested_unsupported:['测试不支持','Not supported in test'],unknown:['未知','Unknown']}, n=lang==='zh'?0:1;
  const desktop=(values[w.device_support?.desktop]||values.unknown)[n], mobile=(values[w.device_support?.mobile]||values.unknown)[n];
  return lang==='zh'?`桌面：${desktop}；手机：${mobile}`:`Desktop: ${desktop}; mobile: ${mobile}`;
}

export function detail(lang,c,w,seo,page){
  const m=messages[lang], l=w.locales[lang], route=`/works/${w.slug}/`, ai=hasAiEvidence(w);
  const creator=creatorName(w,lang)||m.unknown, profile=safeExternalUrl(w.creator?.profile_url);
  const status=w.verification?.level==='interaction_tested'?m.statusTested:w.verification?.level==='page_rendered'?m.statusRendered:m.statusFetched;
  const note=lang==='zh'?(w.verification?.note||status):(w.verification?.note_en||status);
  const tools=(w.ai_provenance?.tools||[]).join(', '), aiDescription=w.ai_provenance?.description?.[lang]||m.aiClaim;
  const aiText=ai?`${aiDescription}${tools?(lang==='zh'?` 使用工具：${tools}。`:` Tools: ${tools}.`):''}`:m.aiUnknown;
  const languages=(w.access?.language_codes||[]).map(code=>langName(code,lang)).join(' / ')||m.unknownValue;
  const original=safeExternalUrl(w.demo_url), evidence=safeExternalUrl(w.ai_provenance?.evidence_url);
  const sourceLinks=(w.sources||[]).filter(x=>safeExternalUrl(x.url)).map(x=>`<a href="${e(safeExternalUrl(x.url))}" target="_blank" rel="noopener noreferrer">${lang==='zh'?'作品来源':'Original source'} ↗</a>`).join('');
  const related=selectRelatedWorks(w,c), memberships=collectionsForWork(w.id,c.collections), type=c.types.find(t=>t.id===w.type), topic=c.taxonomy.categories.find(t=>t.id===w.primary_category);
  const topicName=topicNames[topic?.id]?.[lang==='zh'?0:1]||topic?.id;
  const action=w.verification?.availability==='unavailable'?`<p class="small-note">${lang==='zh'?'原站暂时不可用。':'The original experience is temporarily unavailable.'}</p>`:`<a class="button button-dark detail-open" data-track-event="experience_open" data-track-work="${e(w.id)}" data-track-placement="detail" href="${e(original)}" target="_blank" rel="noopener noreferrer">${e(m.open)} ↗</a><small>${e(m.onOriginal)}</small>`;
  return layout({lang,path:route,seo,body:`<div class="wrap detail-wrap" data-detail-work="${e(w.id)}">${breadcrumbs(page,c)}<section class="detail-top"><div class="detail-visual">${image(w,lang,{context:'detail',priority:'lcp'})}</div><div class="detail-heading"><p class="eyebrow">${e(type?.[lang]||'')} ${ai?'':'· '+e(m.inspiration)}</p><h1>${e(l.title)}</h1><p class="detail-summary">${e(l.summary)}</p><p class="detail-by">${e(m.by)} ${profile?`<a href="${e(profile)}" target="_blank" rel="noopener noreferrer">${e(creator)} ↗</a>`:e(creator)}</p>${action}</div></section><div class="detail-body"><div class="detail-story"><section><p class="eyebrow">01 / ${lang==='zh'?'开始体验':'GET STARTED'}</p><h2>${e(m.how)}</h2><p>${e(l.action)}</p></section><section><p class="eyebrow">02 / ${lang==='zh'?'作品介绍':'ABOUT THE CREATION'}</p><h2>${e(m.why)}</h2><p>${e(l.why)}</p></section><section><p class="eyebrow">03 / ${lang==='zh'?'了解更多':'MORE TO KNOW'}</p><h2>${e(m.limits)}</h2><p>${e(l.limit)}</p></section><section><h2>${lang==='zh'?'继续发现':'Discover more'}</h2>${type?`<p><a href="${e(urlFor(lang,`/types/${type.id}/`))}">${e(type[lang])} →</a></p>`:''}${topic?`<p><a href="${e(urlFor(lang,`/categories/${topic.id}/`))}">${e(topicName)} →</a></p>`:''}${memberships.length?`<p>${lang==='zh'?'所属合集：':'Collections: '}${memberships.map(x=>`<a href="${e(urlFor(lang,`/collections/${x.id}/`))}" data-track-event="collection_open" data-track-placement="collection-${e(x.id)}">${e(x[lang].title)}</a>`).join(' · ')}</p>`:''}</section></div><aside class="detail-facts"><h2>${e(m.sources)}</h2><dl><div><dt>${e(m.original)}</dt><dd>${e(w.title_original)}</dd></div><div><dt>${e(m.originLang)}</dt><dd>${e(languages)}</dd></div><div><dt>${e(m.login)}</dt><dd>${e(access(w,lang))}</dd></div><div><dt>${e(m.device)}</dt><dd>${e(devices(w,lang))}</dd></div><div><dt>${e(m.checked)}</dt><dd>${e(w.verification?.last_checked_at||m.unknownValue)}</dd></div></dl><p class="verification">${e(note)}</p><h3>${e(m.ai)}</h3><p>${e(aiText)}</p>${evidence?`<a href="${e(evidence)}" target="_blank" rel="noopener noreferrer">${e(m.verified)} ↗</a>`:''}${sourceLinks}</aside></div></div>${related.length?`<section class="wrap related-section"><div class="section-heading"><div><span class="section-number">↗</span><h2>${e(m.otherWorks)}</h2></div><a href="${e(urlFor(lang,'/explore/'))}">${e(m.viewAll)} ↗</a></div>${galleryGrid(related,lang,{context:'related',priorityFirst:false})}</section>`:''}`});
}

export function topicPage(lang,c,topic,seo,page){
  const name=topicNames[topic.id]?.[lang==='zh'?0:1]||topic.id, list=listedWorks(page,c);
  const note=lang==='zh'?'这个主题包含 AI 作品，以及创作方式尚未确认的灵感参考。':'This topic includes AI creations and references with unconfirmed origins.';
  return layout({lang,path:`/categories/${topic.id}/`,seo,body:`<section class="wrap listing-intro">${breadcrumbs(page,c)}<p class="eyebrow">FREEMY / TOPIC</p><h1>${e(name)}</h1><p>${e(note)}</p></section><section class="wrap gallery-section listing-section">${galleryGrid(list,lang)}</section>`});
}

export function about(lang,seo){const m=messages[lang];return layout({lang,path:'/about/',seo,body:`<section class="wrap prose-page"><p class="eyebrow">ABOUT FREEMY</p><h1>${e(m.aboutIntro)}</h1><p>${e(m.aboutText)}</p><p>${e(m.footerNote)}</p><a class="button button-dark" href="${e(urlFor(lang,'/explore/'))}">${e(m.explore)} ↗</a></section>`});}
export function privacy(lang,seo){
  const m=messages[lang], text=lang==='zh'?'Freemy 不要求注册。我们使用 Vercel Web Analytics 和 Speed Insights 了解网站访问与性能；语言选择会保存在浏览器本地。网站由 Vercel 提供服务，访问可能产生基本服务日志。点击作品或提交入口后，你会进入第三方网站；这些网站的隐私做法以其自身说明为准。':'Freemy does not require an account. We use Vercel Web Analytics and Speed Insights to understand site visits and performance; your language choice is stored locally in your browser. Vercel hosts the site and may create basic service logs. Creation and submission links open third-party websites, whose own privacy practices apply.';
  const events=seo.analyticsEnabled?(lang==='zh'?'我们还统计作品详情浏览、预览、原站链接、相关作品和合集的点击，只包含作品标识及页面位置，不包含搜索词。':'We also count creation detail views, previews, original-site, related-work and collection clicks using creation identifiers and page placement, without search terms.')+(seo.impressionsEnabled?(lang==='zh'?' 我们也统计实际可见的作品卡片。':' We also count creation cards that are actually visible.'): ''):'';
  return layout({lang,path:'/privacy/',seo,body:`<section class="wrap prose-page"><p class="eyebrow">FREEMY / PRIVACY</p><h1>${e(m.privacy)}</h1><p>${e(text)}</p>${events?`<p>${e(events)}</p>`:''}</section>`});
}
export function submit(lang,seo){
  const m=messages[lang], title=lang==='zh'?'推荐作品 / Creation submission':'Creation submission', content=lang==='zh'?'作品名称：\n体验网址：\n创作者：\n作品简介：\nAI 如何参与：\n相关来源：':'Creation name:\nExperience URL:\nCreator:\nDescription:\nHow AI was involved:\nSources:';
  const issue=`https://github.com/freemyai/website/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(content)}`;
  return layout({lang,path:'/submit/',seo,body:`<section class="wrap prose-page"><p class="eyebrow">FOR CREATORS</p><h1>${e(m.submitIntro)}</h1><p>${e(m.submitText)}</p><a class="button button-dark" href="${e(issue)}" target="_blank" rel="noopener noreferrer">${e(m.submitButton)} ↗</a><p class="small-note">${e(m.submitNote)}</p></section>`});
}
export function notFound(lang,seo){const m=messages[lang];return layout({lang,path:'/404/',seo,body:`<section class="wrap prose-page"><p class="eyebrow">404</p><h1>${e(m.notFound)}</h1><a class="button button-dark" href="${e(urlFor(lang,'/explore/'))}">${e(m.back)} ↗</a></section>`});}
export function fallbackNotFound(seo){return layout({lang:'zh',path:'/404/',seo,body:`<section class="wrap prose-page"><p class="eyebrow">404</p><h1>${e(messages.zh.notFound)}</h1><p lang="en">${e(messages.en.notFound)}</p><div class="dialog-actions"><a class="button button-dark" href="/explore/">${e(messages.zh.back)} ↗</a><a class="button button-light" href="/en/explore/" lang="en">${e(messages.en.back)} ↗</a></div></section>`});}
