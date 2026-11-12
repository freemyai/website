export function publishedWorks(works) {
  return works.filter(work => work.editorial?.status === 'published');
}

export function filterWorks(works, filters = {}) {
  const q = (filters.q || '').trim().toLocaleLowerCase();
  return works.filter(work => {
    const searchable = [work.title_zh, work.title_original, work.summary_zh, work.category_name, work.subcategory_name, work.creator?.name, work.locales?.zh?.title, work.locales?.zh?.summary, work.locales?.en?.title, work.locales?.en?.summary, ...(work.tags || []), ...(work.search_terms || [])].filter(Boolean).join(' ').toLocaleLowerCase();
    return (!q || searchable.includes(q))
      && (!filters.category || work.primary_category === filters.category)
      && (!filters.type || work.type === filters.type)
      && (!filters.format || work.formats?.includes(filters.format))
      && (!filters.login || work.access?.login === filters.login)
      && (!filters.language || work.access?.language_codes?.includes(filters.language))
      && (!filters.mobile || ['tested_supported', 'reported_supported'].includes(work.device_support?.mobile));
  });
}

export function hasAiEvidence(work) {
  const ai = work.ai_provenance;
  return ['author_claimed','documented'].includes(ai?.status) && ['coding','assets','text','mixed'].includes(ai?.usage) && !!safeExternalUrl(ai?.evidence_url);
}

export function eligibleForGallery(work) {
  const translated = ['zh','en'].every(lang => work.locales?.[lang]?.title && work.locales?.[lang]?.summary);
  return work.editorial?.status === 'published' && work.verification?.availability !== 'unavailable' && !!work.media?.poster?.src &&
    hasAiEvidence(work) && translated;
}

export function localizedPath(current, lang, search = '') {
  let base = current.replace(/^\/en(?=\/|$)/, '') || '/';
  if (/^\/zh\/?$/.test(base)) base = '/';
  if (!base.startsWith('/')) base = `/${base}`;
  if (base === '/') return `${lang === 'zh' ? '/zh/' : '/'}${search}`;
  return `${lang === 'en' ? '/en' : ''}${base}${search}`;
}

export function safeExternalUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
  } catch { return null; }
}

export function assertUniqueExperienceUrls(works) {
  const seen = new Map();
  for (const work of works) {
    const valid = safeExternalUrl(work.demo_url);
    if (!valid) continue;
    const url = new URL(valid);
    const trackingKeys = new Set(['utm_source','utm_medium','utm_campaign','utm_term','utm_content','utm_id','fbclid','gclid','msclkid','dclid','gbraid','wbraid']);
    for (const key of [...url.searchParams.keys()]) {
      if (trackingKeys.has(key.toLowerCase())) url.searchParams.delete(key);
    }
    url.searchParams.sort();
    const canonical = url.href;
    if (seen.has(canonical)) throw new Error(`Duplicate experience URL: ${seen.get(canonical)} and ${work.id}`);
    seen.set(canonical, work.id);
  }
}

export function accessLabel(access = {}) {
  const login = { none:'无需登录', optional:'可选登录', required:'需要登录', unknown:'未知' };
  const pricing = { free:'免费', freemium:'部分免费', paid:'付费', unknown:'未知' };
  return `${login[access.login] || '未知'} / ${pricing[access.pricing] || '未知'}`;
}

export function deviceLabel(devices = {}) {
  if ((!devices.desktop || devices.desktop === 'unknown') && (!devices.mobile || devices.mobile === 'unknown')) return '未知';
  const names = { tested_supported:'已测试', reported_supported:'原站称支持', tested_unsupported:'测试不支持', unknown:'未知' };
  return `桌面${names[devices.desktop] || '未知'} / 手机${names[devices.mobile] || '未知'}`;
}

export function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}
