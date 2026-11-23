// Banco de empleo: filtra y ordena tarjetas en el dispositivo. No guarda nada; no hace solicitudes.
const form = document.getElementById('empleos-form') as HTMLFormElement | null;
if (form) {
  const list = document.getElementById('cards') as HTMLOListElement;
  const cards = Array.from(list.querySelectorAll<HTMLElement>('.job-card'));
  const summary = document.getElementById('summary')!;
  const empty = document.getElementById('empty')!;
  const reviewed = document.getElementById('reviewed')!;
  const seenOnly = document.getElementById('seen-only') as HTMLInputElement;
  const q = document.getElementById('q') as HTMLInputElement;
  const labels: Record<string, string> = { cajero: 'Cajero/a', asesor: 'Asesor/a financiero', cobranza: 'Gestor/a de cobranza', verificador: 'Verificador/a', gerente: 'Gerente de sucursal', oficinas: 'Oficinas centrales' };
  const fitText = ['No suele tener este puesto', 'Poco probable', 'Encaja', 'Encaja muy bien'];
  const fitMark = ['○', '◔', '◑', '●'];

  const val = (name: string) => (form.elements.namedItem(name) as RadioNodeList).value;
  const num = (el: HTMLElement, k: string) => Number(el.dataset[k] ?? 0);

  function update() {
    const role = val('role');
    const type = val('type') || 'todos';
    const term = q.value.trim().toLowerCase();
    const visible: HTMLElement[] = [];
    for (const c of cards) {
      const okType = type === 'todos' || c.dataset.type === type;
      const okName = !term || (c.dataset.name ?? '').includes(term);
      const okSeen = !seenOnly.checked || !role || num(c, 'n' + cap(role)) > 0;
      const show = okType && okName && okSeen;
      c.hidden = !show;
      const badge = c.querySelector<HTMLElement>('[data-fit-badge]')!;
      const meter = c.querySelector<HTMLElement>('[data-meter]')!;
      c.querySelectorAll<HTMLElement>('[data-role-hint]').forEach((h) => { h.hidden = h.dataset.roleHint !== role; });
      if (role) {
        const f = num(c, 'fit' + cap(role));
        badge.hidden = false;
        badge.dataset.level = String(f);
        badge.textContent = `${fitMark[f]} ${fitText[f]}`;
        c.classList.toggle('dim', f === 0);
      } else {
        badge.hidden = true; meter.hidden = true;
        c.classList.remove('dim');
      }
      if (show) visible.push(c);
    }
    // Se reordena el DOM (no solo lo visual) para que el orden del teclado coincida con lo que se ve.
    const sorted = [...cards].sort((a, b) => {
      if (!role) return (a.dataset.name ?? '').localeCompare(b.dataset.name ?? '', 'es');
      const k = cap(role);
      return num(b, 'fit' + k) - num(a, 'fit' + k) || num(b, 'n' + k) - num(a, 'n' + k) || (a.dataset.name ?? '').localeCompare(b.dataset.name ?? '', 'es');
    });
    list.append(...sorted);
    // Los tres mejores se destacan.
    let rank = 0;
    for (const c of sorted) {
      const r = c.querySelector<HTMLElement>('[data-rank]')!;
      const top = !!role && !c.hidden && rank < 3 && num(c, 'fit' + cap(role)) >= 2;
      c.classList.toggle('best', top);
      r.hidden = !top;
      if (top) { rank++; r.textContent = ['Mejor encaje', 'Segundo mejor', 'Tercer mejor'][rank - 1]; }
    }
    empty.hidden = visible.length > 0;
    summary.textContent = role
      ? `${visible.length} empresa${visible.length === 1 ? '' : 's'} para ${labels[role]}, las que más encajan primero.`
      : `Elige tu puesto arriba. Mientras tanto, estas son las ${visible.length} opciones.`;
    countReviewed();
  }
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  function countReviewed() {
    const total = cards.filter((c) => !c.hidden).length;
    const done = cards.filter((c) => !c.hidden && (c.querySelector('.done') as HTMLInputElement).checked).length;
    reviewed.textContent = done ? `Revisaste ${done} de ${total}.` : '';
  }
  form.addEventListener('input', update);
  form.addEventListener('submit', (e) => e.preventDefault());
  list.addEventListener('change', (e) => {
    const t = e.target as HTMLInputElement;
    if (t.classList.contains('done')) {
      (t.closest('.job-card') as HTMLElement).classList.toggle('dim', t.checked);
      countReviewed();
    }
  });
  document.getElementById('copy-top')?.addEventListener('click', async () => {
    const top = [...cards].filter((c) => !c.hidden).slice(0, 10).map((c) => `${(c.querySelector('h2') as HTMLElement).textContent}: ${c.dataset.url}`);
    const say = (window as unknown as { aba?: { say: (m: string) => void } }).aba?.say;
    try { await navigator.clipboard.writeText(top.join('\n')); say?.('Copiaste ' + top.length + ' enlaces'); } catch { say?.('No se pudo copiar. Cópialos a mano.'); }
  });
  update();
}
