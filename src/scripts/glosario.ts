// Busca y filtra las tarjetas del glosario en el aparato. No se guarda ni se envía nada.
const q = document.getElementById('gl-q') as HTMLInputElement | null;
if (q) {
  const cards = Array.from(document.querySelectorAll<HTMLElement>('.gl-card'));
  const count = document.getElementById('gl-count')!;
  const empty = document.getElementById('gl-empty')!;
  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const cat = () => (document.querySelector<HTMLInputElement>('input[name="gcat"]:checked')?.id ?? 'g-all').replace('g-', '');
  function update() {
    const term = norm(q!.value.trim());
    const c = cat();
    let n = 0;
    for (const card of cards) {
      const okCat = c === 'all' || card.dataset.cat === c;
      const okTerm = !term || norm(card.dataset.q ?? '').includes(term);
      card.hidden = !(okCat && okTerm);
      if (!card.hidden) n++;
    }
    count.textContent = `${n} palabra${n === 1 ? '' : 's'}`;
    empty.hidden = n > 0;
  }
  q.addEventListener('input', update);
  document.querySelectorAll('input[name="gcat"]').forEach((r) => r.addEventListener('change', update));
  update();
}
