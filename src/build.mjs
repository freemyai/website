import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCatalog } from './validate.mjs';
import { escapeHtml as e, publishedWorks, safeExternalUrl, accessLabel, deviceLabel } from './catalog.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.resolve(root, 'dist');
if (out !== path.join(root, 'dist')) throw new Error('Unexpected output directory');
const { taxonomy, works: allWorks } = loadCatalog();
const works = publishedWorks(allWorks).map(w => {
  const cat = taxonomy.categories.find(c => c.id === w.primary_category);
  return { ...w, category_name: cat.name_zh, subcategory_name: cat.subcategories.find(s => s.id === w.subcategory).name_zh };
});
const categories = taxonomy.categories.filter(c => works.some(w => w.primary_category === c.id));
const formatNames = Object.fromEntries(taxonomy.formats.map(f => [f.id, f.name_zh]));
const shortFormats = { simulation:'模拟实验', explainer:'原理讲解', tutorial:'引导教程', game:'浏览器游戏', creative:'艺术创作', showcase:'互动展示', utility:'轻量工具' };
const symbols = { physics:'✳', engineering:'✺', electronics:'⌁', robotics:'✣', mathematics:'∑', computing:'⌘', nature:'✿', humanities:'〰', games:'✦', creative:'✧', spatial:'◇', tools:'⌗' };
const subtitle = { physics:'让现象变得看得见', engineering:'拆开机器的秘密', electronics:'把电路连接起来', robotics:'让机器感知与行动' };

function art(kind, number = '01') {
  const drawings = {
    hydraulic:`<path d="M48 49h30v65H48zM180 31h44v83h-44zM78 91h102M48 75h30M180 65h44"/><path d="M35 114h202M63 49V27M202 31V15"/><circle cx="63" cy="24" r="5"/><path d="M113 76v-22m0 0-7 7m7-7 7 7M149 76v-38m0 0-7 7m7-7 7 7"/>`,
    motor:`<circle cx="138" cy="72" r="49"/><circle cx="138" cy="72" r="25"/><circle cx="138" cy="72" r="6"/><path d="M89 72H65m122 0h24M138 23V8m0 128v-15M104 37l17 17m34 36 17 17m0-70-17 17m-34 36-17 17"/><path d="M45 59h20v26H45zM211 59h20v26h-20z"/>`,
    gears:`<circle cx="102" cy="70" r="40"/><circle cx="102" cy="70" r="17"/><circle cx="178" cy="80" r="33"/><circle cx="178" cy="80" r="12"/><path d="M102 19v10m0 82v10M51 70h10m82 0h10M66 34l8 8m56 56 8 8m0-72-8 8M66 106l8-8M178 38v9m0 66v9m-42-42h9m66 0h9m-72-30 7 7m47 47 7 7m0-54-7 7m-47 47-7 7"/>`,
    airfoil:`<path d="M43 81c45-27 91-47 179-15-54-4-110 33-179 15Z"/><path d="M25 40c50 2 65-20 110-20 41 0 67 12 106 9M22 54c49 1 71-21 112-20 42 0 71 15 110 11M24 105c52 0 70 10 111 9 45-1 68-16 110-13M22 120c46 0 69 10 111 9 47-1 70-12 113-12"/>`,
    circuit:`<path d="M52 44h61m50 0h62v59h-52m-39 0H52V44M113 29v30m13-24v18m37-24v30M134 103l6-10 7 20 7-20 7 20 7-10h5"/><circle cx="52" cy="44" r="4"/><circle cx="225" cy="103" r="4"/><circle cx="52" cy="103" r="4"/>`,
    meter:`<rect x="92" y="16" width="96" height="114" rx="12"/><rect x="106" y="29" width="68" height="25" rx="3"/><circle cx="140" cy="86" r="23"/><path d="M140 86l10-12M116 119h3m41 0h3M140 58v6m-22 22h6m32 0h6M194 101h31l10 24M86 101H56l-10 24"/>`,
    robot:`<rect x="82" y="52" width="112" height="58" rx="16"/><circle cx="109" cy="80" r="9"/><circle cx="167" cy="80" r="9"/><path d="M119 100h38M138 52V34m-8 0h16M55 113h166M98 110l-8 14m87-14 8 14M205 44q18 9 18 25m-9-36q26 13 26 36"/>`,
    pendulum:`<path d="M53 24h170M138 24v15M138 39l-50 67M138 39l54 67"/><path d="M88 106a72 72 0 0 0 104 0" stroke-dasharray="4 7"/><circle cx="88" cy="106" r="13"/><circle cx="192" cy="106" r="13"/><circle cx="138" cy="39" r="4"/>`,
    light:`<path d="M32 74h212M47 18l89 56 64 54M136 74l76-48"/><circle cx="136" cy="74" r="5"/><path d="M162 16v116" stroke-dasharray="4 7"/><path d="M52 26v15m-7-7h15"/>`,
    arm:`<circle cx="70" cy="110" r="10"/><circle cx="115" cy="48" r="9"/><circle cx="188" cy="70" r="9"/><path d="M70 110l45-62 73 22m-48 50h85M54 120h35M188 70l18-13m-18 13 15 16M214 25l3 8 8 3-8 3-3 8-3-8-8-3 8-3z"/>`
  };
  return `<svg class="art-svg" viewBox="0 0 276 145" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${drawings[kind] || drawings.gears}</g></svg><span class="art-index">${e(number)} / EXPLORE</span>`;
}

function card(w, i = 0) {
  return `<article class="work-card" data-work="${e(JSON.stringify(w))}">
    <a class="card-image art-${e(w.art)}" href="/works/${e(w.slug)}/" aria-label="查看${e(w.title_zh)}的介绍">${art(w.art, String(i + 1).padStart(2,'0'))}<span class="card-arrow">↗</span></a>
    <div class="card-copy"><div class="card-meta"><span>${e(w.category_name)}</span><span class="meta-dot"></span><span>${e(shortFormats[w.formats[0]] || '')}</span></div>
      <h3><a href="/works/${e(w.slug)}/">${e(w.title_zh)}</a></h3><p>${e(w.summary_zh)}</p>
      <div class="card-bottom"><span>${e(w.creator?.name || '作者待确认')}</span><a href="/works/${e(w.slug)}/" aria-label="了解${e(w.title_zh)}">了解作品 <span aria-hidden="true">↗</span></a></div></div></article>`;
}
function categoryTile(c, i) {
  const count = works.filter(w => w.primary_category === c.id).length;
  return `<a class="category-tile category-${e(c.id)}" href="/categories/${e(c.id)}/"><span class="category-top"><span>0${i+1} / TOPIC</span><span>↗</span></span><span class="category-symbol">${e(symbols[c.id] || '✳')}</span><span class="category-title">${e(c.name_zh)}</span><span class="category-desc">${e(subtitle[c.id] || c.description_zh)}</span><span class="category-count">${count} 个作品</span></a>`;
}
function header() {
  return `<a class="skip-link" href="#main">跳至内容</a><header class="site-header"><div class="wrap header-inner"><a class="brand" href="/" aria-label="Freemy 首页"><span class="brand-mark">✳</span><span class="brand-word">freemy<span>.</span></span><span class="brand-cn">好奇心探索站</span></a><nav aria-label="主导航"><a href="/explore/">发现作品</a><a href="/#topics">探索主题</a><a href="/about/">关于我们</a></nav><a class="header-cta" href="/explore/">开始探索 <span>↗</span></a></div></header>`;
}
function footer() {
  return `<footer class="site-footer"><div class="wrap footer-top"><div><a class="brand footer-brand" href="/"><span class="brand-mark">✳</span><span class="brand-word">freemy<span>.</span></span></a><p>让好奇心有地方去。</p></div><div class="footer-links"><a href="/explore/">发现作品</a><a href="/#topics">探索主题</a><a href="/about/">关于与收录说明</a></div><span class="footer-star" aria-hidden="true">✳</span></div><div class="wrap footer-bottom"><span>© ${new Date().getUTCFullYear()} FREEMY · MADE FOR CURIOUS MINDS</span><span>作品由各自的创作者提供</span></div></footer>`;
}
function layout({title, description, body, currentPath = '/'}) {
  const pageTitle = title ? `${title} · Freemy 好奇心探索站` : 'Freemy 好奇心探索站 · 发现值得亲手探索的网页';
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#122820"><title>${e(pageTitle)}</title><meta name="description" content="${e(description || '精选互动实验、原理讲解与创意网页，把好奇心变成一次动手。')}"><link rel="canonical" href="https://freemy.ai${e(currentPath)}"><link rel="icon" href="/assets/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/assets/style.css"><script type="module" src="/assets/app.mjs"></script></head><body>${header()}<main id="main">${body}</main>${footer()}</body></html>`;
}
function searchForm() {
  return `<form class="hero-search" action="/explore/" method="get"><label class="sr-only" for="home-search">搜索作品或主题</label><span aria-hidden="true">⌕</span><input id="home-search" type="search" name="q" placeholder="试试搜索「齿轮」或「机器人」"><button type="submit">搜索 <span>↗</span></button></form>`;
}
const featured = ['hydraulics','gears','sonar-robot','circuitjs','pendulum-lab','electric-motor'].map(id => works.find(w => w.id === id)).filter(Boolean);
function home() {
  return layout({body:`<section class="hero wrap"><div class="hero-content"><p class="eyebrow light"><span class="spark">✳</span> A LITTLE MORE CURIOUS, EVERY DAY</p><h1>把好奇心，<br><em>变成一次动手。</em></h1><p class="hero-lede">这里收藏好玩、好懂、值得亲手探索的互动网页。<br>从一个问题出发，打开一个新的世界。</p>${searchForm()}<div class="hero-foot"><span>✳&nbsp; 为好奇的人准备</span><span>SCROLL TO EXPLORE ↓</span></div></div><div class="hero-visual" aria-hidden="true"><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><div class="hero-disc"><span class="disc-top">THE CURIOSITY<br>EXPERIMENT</span><span class="disc-star">✳</span><span class="disc-bottom">A WORLD OF<br>INTERACTIVE IDEAS ↗</span></div><span class="visual-cross cross-one">✛</span><span class="visual-cross cross-two">✳</span><span class="visual-sticker">PLAY<br>LEARN<br>REPEAT ↗</span><span class="visual-caption">GOOD IDEAS ARE<br>MEANT TO BE EXPLORED.</span></div></section>
  <div class="ticker"><div class="wrap ticker-inner"><span>少一点旁观，多一点动手</span><span>✳</span><span>科学与物理</span><span>✳</span><span>工程与机械</span><span>✳</span><span>电子与电路</span><span>✳</span><span>机器人与控制</span></div></div>
  <section class="section wrap" id="featured"><div class="section-heading"><div><p class="eyebrow">01 / EDITOR'S PICKS</p><h2>从这里，开始探索<span class="green-dot">.</span></h2><p>一些让人忍不住想动手试试的作品。</p></div><a class="text-link" href="/explore/">查看全部作品 <span>↗</span></a></div><div class="work-grid">${featured.map(card).join('')}</div><div class="center-action"><a class="outline-button" href="/explore/">发现更多作品 <span>↗</span></a></div></section>
  <section class="topics-section" id="topics"><div class="wrap"><div class="section-heading"><div><p class="eyebrow">02 / FIND YOUR THING</p><h2>今天想探索什么？<span class="green-dot">.</span></h2><p>跟着兴趣走，每个主题都是一个入口。</p></div><span class="heading-note">PICK A TOPIC<br>AND DIVE IN ↙</span></div><div class="category-grid">${categories.map(categoryTile).join('')}</div></div></section>
  <section class="section wrap recent-section"><div class="section-heading"><div><p class="eyebrow">03 / FRESHLY COLLECTED</p><h2>最近收录<span class="green-dot">.</span></h2><p>新的灵感，也许就在下一个链接里。</p></div><a class="text-link" href="/explore/">浏览作品库 <span>↗</span></a></div><div class="recent-list">${works.slice(-4).map((w,i)=>`<a class="recent-row" href="/works/${e(w.slug)}/"><span class="recent-num">0${i+1}</span><span><strong>${e(w.title_zh)}</strong><small>${e(w.summary_zh)}</small></span><span class="recent-tag">${e(w.category_name)}</span><span class="recent-arrow">↗</span></a>`).join('')}</div></section>
  <section class="wrap"><div class="about-banner"><div><p class="eyebrow light">A SMALL NOTE FROM FREEMY</p><h2>世界很大，<br>先从一个问题开始。</h2><p>我们整理值得探索的互动作品，写下它们有趣在哪里，再带你前往创作者的原站。</p><a class="banner-link" href="/about/">了解我们的收录方式 ↗</a></div><div class="banner-graphic" aria-hidden="true"><span>✳</span><p>STAY<br>CURIOUS.</p></div></div></section>`});
}
function filters(categoryId='') {
  return `<form id="catalog-filters" class="filter-bar" role="search"><label class="filter-search"><span aria-hidden="true">⌕</span><span class="sr-only">搜索作品</span><input name="q" type="search" placeholder="搜索作品、主题或关键词"></label><label><span class="sr-only">作品形式</span><select name="format"><option value="">全部形式</option>${Object.entries(shortFormats).map(([id,name])=>`<option value="${e(id)}">${e(name)}</option>`).join('')}</select></label><label><span class="sr-only">登录条件</span><select name="login"><option value="">登录条件不限</option><option value="none">已确认免登录</option></select></label><label><span class="sr-only">设备</span><select name="mobile"><option value="">设备不限</option><option value="supported">已确认支持手机</option></select></label><label><span class="sr-only">界面语言</span><select name="language"><option value="">语言不限</option><option value="zh-CN">中文</option><option value="en">英语</option><option value="es">西班牙语</option></select></label><button type="reset">重置</button>${categoryId ? `<input type="hidden" name="category" value="${e(categoryId)}">` : ''}</form>`;
}
function explore(cat = null) {
  const list = cat ? works.filter(w => w.primary_category === cat.id) : works;
  const intro = cat ? cat.description_zh : '每个作品都是一个可以亲自探索的入口。找到感兴趣的，打开试试看。';
  return layout({title:cat?.name_zh || '发现作品', description:intro, currentPath:cat?`/categories/${cat.id}/`:'/explore/', body:`<section class="catalog-intro wrap"><p class="eyebrow">${cat ? `TOPIC / ${e(cat.id.toUpperCase())}` : 'THE EXPLORATION LIBRARY'}</p><div class="catalog-title"><div><h1>${e(cat?.name_zh || '发现作品')}<span class="green-dot">.</span></h1><p>${e(intro)}</p></div><div class="catalog-icon" aria-hidden="true">${e(cat ? symbols[cat.id] || '✳' : '✳')}</div></div><div class="topic-pills"><a class="${!cat?'active':''}" href="/explore/">全部作品</a>${categories.map(c=>`<a class="${cat?.id===c.id?'active':''}" href="/categories/${e(c.id)}/">${e(c.name_zh)}</a>`).join('')}</div></section><section class="wrap catalog-section">${filters(cat?.id || '')}<div class="result-line"><p><strong id="result-count">${list.length}</strong> 个作品 <span>· ${cat ? e(cat.name_zh) : '全部主题'}</span></p><span>EXPLORE AT YOUR OWN PACE ↗</span></div><div class="work-grid" id="catalog-grid">${list.map(card).join('')}</div><div class="empty-state" id="empty-state" hidden><span>⌕</span><h2>暂时没有找到匹配的作品</h2><p>换个关键词或减少筛选条件，再试一次。</p></div><p class="filter-note">使用条件只显示已经确认的信息；未知条件不会被算作“免登录”或“支持手机”。</p></section>`});
}
function detail(w) {
  const sourceLinks = (w.sources || []).filter(s=>safeExternalUrl(s.url)).map(s=>`<a href="${e(safeExternalUrl(s.url))}" target="_blank" rel="noopener noreferrer">${e(s.label)} ↗</a>`).join('');
  const creator = w.creator?.name || '未确认';
  const lang = w.access.language_codes.length ? w.access.language_codes.map(x=>({'zh-CN':'中文','en':'英语','es':'西班牙语'}[x] || x)).join('、') : '未知';
  return layout({title:w.title_zh, description:w.summary_zh, currentPath:`/works/${w.slug}/`, body:`<div class="wrap detail-wrap"><nav class="breadcrumbs" aria-label="面包屑"><a href="/">首页</a><span>/</span><a href="/categories/${e(w.primary_category)}/">${e(w.category_name)}</a><span>/</span><span>${e(w.title_zh)}</span></nav><div class="detail-grid"><div class="detail-main"><div class="detail-art art-${e(w.art)}">${art(w.art,'✳')}<span class="detail-art-label">THE WORLD IS<br>YOURS TO EXPLORE ↗</span></div><p class="eyebrow">${e(w.category_name)} / ${e(w.subcategory_name)}</p><h1>${e(w.title_zh)}</h1><p class="detail-lede">${e(w.summary_zh)}</p><div class="tag-row">${w.formats.map(f=>`<span>${e(shortFormats[f] || formatNames[f])}</span>`).join('')}${w.tags.map(t=>`<span>${e(t)}</span>`).join('')}</div><a class="solid-button mobile-visit" href="${e(safeExternalUrl(w.demo_url))}" target="_blank" rel="noopener noreferrer">前往原站体验 <span>↗</span></a><div class="detail-story"><section><p class="eyebrow">01 / START HERE</p><h2>第一次怎么玩？</h2><p>${e(w.first_action_zh)}</p><p>${e(w.expected_result_zh)}</p></section><section><p class="eyebrow">02 / WHY IT'S HERE</p><h2>为什么值得一看</h2><p>${e(w.reason_zh)}</p></section><section><p class="eyebrow">03 / BEFORE YOU GO</p><h2>使用前了解</h2><p>${e(w.quality.limitations_zh)}</p><p>这是第三方创作者提供的作品，体验在原站进行，内容和访问条件可能变化。</p></section></div></div><aside class="detail-side"><div class="visit-box"><p class="eyebrow">READY TO EXPLORE?</p><h2>好奇的话，<br>就去试试看。</h2><p>你将离开 Freemy，前往作品原站。</p><a class="solid-button" href="${e(safeExternalUrl(w.demo_url))}" target="_blank" rel="noopener noreferrer">前往原站体验 <span>↗</span></a></div><div class="facts-box"><h3>作品信息</h3><dl><div><dt>原文标题</dt><dd>${e(w.title_original)}</dd></div><div><dt>创作者</dt><dd>${w.creator?.profile_url && safeExternalUrl(w.creator.profile_url) ? `<a href="${e(safeExternalUrl(w.creator.profile_url))}" target="_blank" rel="noopener noreferrer">${e(creator)} ↗</a>` : e(creator)}</dd></div><div><dt>界面语言</dt><dd>${e(lang)}</dd></div><div><dt>登录 / 收费</dt><dd>${e(accessLabel(w.access))}</dd></div><div><dt>设备支持</dt><dd>${e(deviceLabel(w.device_support))}</dd></div><div><dt>检查日期</dt><dd>${e(w.verification.last_checked_at || '未知')}</dd></div></dl><p class="verification-note">${e(w.verification.note)}</p><div class="source-links"><span>来源</span>${sourceLinks}</div></div></aside></div><div class="back-row"><a class="text-link" href="/categories/${e(w.primary_category)}/">← 继续探索${e(w.category_name)}</a></div></div>`});
}
function about() {
  return layout({title:'关于我们', currentPath:'/about/', body:`<section class="wrap about-page"><p class="eyebrow">ABOUT FREEMY / 关于这个地方</p><h1>给好奇心<br>一个<span class="highlight">出发点。</span></h1><div class="about-columns"><p class="about-lead">我们相信，比起只看一遍，亲手试一次，往往更容易理解这个世界。</p><div><h2>这里有什么？</h2><p>Freemy 收集值得探索的互动实验、原理讲解与创意网页。我们用中文说明它是什么、可以怎样开始，然后把你带到创作者的原站。</p><h2>我们如何记录？</h2><p>作品详情会说明来源和检查程度。页面能打开，并不等于我们完成了所有交互测试；登录、收费、设备等条件没有确认时，会标为未知。</p><p>原站作品由各自的创作者提供，具体内容、可用性与使用条件以原站为准。科学和工程类演示主要帮助理解原理，不能代替专业计算。</p><a class="solid-button" href="/explore/">去发现作品 ↗</a></div></div></section>`});
}
function writePage(name, content) {
  const target = path.join(out, name, 'index.html');
  fs.mkdirSync(path.dirname(target), {recursive:true});
  fs.writeFileSync(target, content);
}

fs.rmSync(out, { recursive:true, force:true });
fs.mkdirSync(path.join(out,'assets'),{recursive:true});
for (const name of ['style.css','app.mjs','favicon.svg']) fs.copyFileSync(path.join(root,'assets',name),path.join(out,'assets',name));
fs.copyFileSync(path.join(root,'src/catalog.mjs'),path.join(out,'assets/catalog.mjs'));
writePage('', home());
writePage('explore', explore());
writePage('about', about());
for (const category of categories) writePage(`categories/${category.id}`, explore(category));
for (const work of works) writePage(`works/${work.slug}`, detail(work));
fs.writeFileSync(path.join(out,'404.html'),layout({title:'页面未找到',body:'<section class="wrap about-page"><p class="eyebrow">404 / PAGE NOT FOUND</p><h1>这里还没有<br>发现新世界。</h1><p>这个页面可能已移动。</p><a class="solid-button" href="/explore/">去发现作品 ↗</a></section>'}));
fs.writeFileSync(path.join(out,'robots.txt'),'User-agent: *\nAllow: /\nSitemap: https://freemy.ai/sitemap.xml\n');
const urls=['/','/explore/','/about/',...categories.map(c=>`/categories/${c.id}/`),...works.map(w=>`/works/${w.slug}/`)];
fs.writeFileSync(path.join(out,'sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(u=>`<url><loc>https://freemy.ai${u}</loc></url>`).join('')}</urlset>`);
console.log(`Built ${works.length} published works in ${categories.length} populated categories.`);
