import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { escapeHtml as e } from './catalog.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const kinds = new Set(['source_walkthrough', 'author_summary', 'implementation_idea']);
const text = value => typeof value === 'string' && value.trim().length > 0;

function safeReference(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && !url.port ? url.href : null;
  } catch { return null; }
}

function readNote(relative) {
  const base = fs.realpathSync(path.join(root, 'content', 'learning'));
  const file = path.join(root, relative);
  if (!fs.lstatSync(file).isFile()) throw new Error(`Invalid learning note file: ${relative}`);
  const resolved = fs.realpathSync(file), inside = path.relative(base, resolved);
  if (!inside || inside.startsWith('..') || path.isAbsolute(inside)) throw new Error(`Unsafe learning note path: ${relative}`);
  return fs.readFileSync(resolved, 'utf8');
}

function validateNote(note, kind) {
  if (!note || note.kind !== kind || !text(note.title) || !text(note.summary) || !Array.isArray(note.sections) || !note.sections.length) throw new Error('Invalid learning note content');
  for (const section of note.sections) {
    if (!text(section.heading) || !Array.isArray(section.paragraphs) || !Array.isArray(section.bullets) ||
        ![...section.paragraphs, ...section.bullets].every(text) || !section.paragraphs.length && !section.bullets.length) throw new Error('Invalid learning note section');
  }
  if (!Array.isArray(note.references) || !note.references.length || note.references.some(ref => !/^[a-z0-9-]+$/.test(ref.id || '') || !text(ref.label) || !safeReference(ref.url))) throw new Error('Invalid learning note reference URL');
  return note;
}

// Both languages are checked together so a partial translation never becomes public.
export function loadPublishedLearningNote(record, locale, {readText=readNote}={}) {
  const entry = record?.learning_note;
  if (entry?.status !== 'published') return null;
  if (!['zh','en'].includes(locale) || !/^[a-z0-9-]+$/.test(record.work_id || '') || !kinds.has(entry.kind) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(entry.reviewed_at || '') || !Array.isArray(entry.evidence_urls) ||
      !entry.evidence_urls.length || entry.evidence_urls.some(url => !safeReference(url))) throw new Error(`Invalid published learning note: ${record.work_id}`);
  const notes = {};
  for (const lang of ['zh','en']) {
    const expected = `content/learning/${lang}/${record.work_id}.json`;
    if (entry[`${lang}_path`] !== expected) throw new Error(`Invalid learning note path: ${record.work_id}/${lang}`);
    notes[lang] = validateNote(JSON.parse(readText(expected)), entry.kind);
  }
  return notes[locale];
}

export function renderLearningNote(note, locale) {
  if (!note) return '';
  const labels = locale === 'zh'
    ? {source_walkthrough:'源码解读',author_summary:'创作说明',implementation_idea:'实现思路',references:'参考来源'}
    : {source_walkthrough:'Code walkthrough',author_summary:'Creator notes',implementation_idea:'Implementation ideas',references:'References'};
  const caveat = note.kind === 'implementation_idea'
    ? `<p class="learning-caveat">${locale === 'zh' ? '以下是实现类似效果的一种原创思路，不是原作者实现，也不代表原作技术栈。' : 'These are original ideas for a similar effect, not the original creator’s implementation or a claim about its technology.'}</p>` : '';
  const sections = note.sections.map(section => `<div class="learning-section"><h3>${e(section.heading)}</h3>${section.paragraphs.map(p=>`<p>${e(p)}</p>`).join('')}${section.bullets.length?`<ul>${section.bullets.map(item=>`<li>${e(item)}</li>`).join('')}</ul>`:''}</div>`).join('');
  const references = note.references.map(ref=>`<li><a href="${e(safeReference(ref.url))}" target="_blank" rel="noopener noreferrer">${e(ref.label)} ↗</a></li>`).join('');
  return `<section id="learning" class="learning-note"><p class="eyebrow">${e(labels[note.kind])}</p><h2>${e(note.title)}</h2><p>${e(note.summary)}</p>${caveat}${sections}<h3>${e(labels.references)}</h3><ul>${references}</ul></section>`;
}
