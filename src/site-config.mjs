export const SITE_ORIGIN = 'https://freemy.ai';

export function siteUrl(path) {
  if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//') || /[?#]/.test(path)) {
    throw new Error(`Invalid canonical path: ${path}`);
  }
  return `${SITE_ORIGIN}${path}`;
}
