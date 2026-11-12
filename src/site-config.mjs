export const SITE_ORIGIN = 'https://freemy.ai';

// Opt in only after confirming the team's analytics plan supports custom events.
export const CUSTOM_EVENTS_ENABLED = process.env.VERCEL_ENV === 'production' && process.env.FREEMY_CUSTOM_EVENTS === '1';

export function siteUrl(path) {
  let valid=typeof path==='string'&&path.startsWith('/')&&!path.startsWith('//')&&!/[?#\\]/.test(path);
  try {
    const parsed=new URL(path,SITE_ORIGIN), decoded=decodeURIComponent(parsed.pathname);
    valid=valid&&parsed.origin===SITE_ORIGIN&&parsed.pathname===path&&!decoded.includes('\\')&&!decoded.split('/').some(part=>part==='.'||part==='..');
  } catch { valid=false; }
  if (!valid) {
    throw new Error(`Invalid canonical path: ${path}`);
  }
  return `${SITE_ORIGIN}${path}`;
}
