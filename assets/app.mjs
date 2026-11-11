import { filterWorks } from './catalog.mjs';

const form = document.querySelector('#catalog-filters');
if (form) {
  const cards = [...document.querySelectorAll('#catalog-grid .work-card')];
  const entries = cards.map(card => ({ card, work: JSON.parse(card.dataset.work) }));
  const count = document.querySelector('#result-count');
  const empty = document.querySelector('#empty-state');
  const params = new URLSearchParams(location.search);
  for (const key of ['q', 'format', 'login', 'mobile', 'language']) {
    const field = form.elements.namedItem(key);
    if (field && params.has(key)) field.value = params.get(key);
  }
  const update = () => {
    const values = Object.fromEntries(new FormData(form).entries());
    const visible = new Set(filterWorks(entries.map(x => x.work), values).map(x => x.id));
    for (const item of entries) item.card.hidden = !visible.has(item.work.id);
    count.textContent = String(visible.size);
    empty.hidden = visible.size !== 0;
    const next = new URL(location.href);
    for (const key of ['q', 'format', 'login', 'mobile', 'language']) {
      if (values[key]) next.searchParams.set(key, values[key]); else next.searchParams.delete(key);
    }
    history.replaceState(null, '', next);
  };
  form.addEventListener('input', update);
  form.addEventListener('change', update);
  form.addEventListener('submit', event => { event.preventDefault(); update(); });
  form.addEventListener('reset', () => requestAnimationFrame(update));
  update();
}
