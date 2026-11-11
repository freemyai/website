export function publishedWorks(works) {
  return works.filter(work => work.editorial?.status === 'published');
}

export function filterWorks(works, filters = {}) {
  const q = (filters.q || '').trim().toLocaleLowerCase();
  return works.filter(work => {
    const searchable = [work.title_zh, work.title_original, work.summary_zh, work.category_name, work.subcategory_name, ...(work.tags || [])].filter(Boolean).join(' ').toLocaleLowerCase();
    return (!q || searchable.includes(q))
      && (!filters.category || work.primary_category === filters.category)
      && (!filters.format || work.formats?.includes(filters.format))
      && (!filters.login || work.access?.login === filters.login)
      && (!filters.language || work.access?.language_codes?.includes(filters.language))
      && (!filters.mobile || ['tested_supported', 'reported_supported'].includes(work.device_support?.mobile));
  });
}

export function safeExternalUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
  } catch { return null; }
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
