// Inventario personal para usar la IA con lo propio. Todo ocurre en el aparato: no se guarda ni se envía nada.
const form = document.getElementById('inv-form');
if (form) {
  const areas = Array.from(form.querySelectorAll<HTMLTextAreaElement>('textarea'));
  const out = document.getElementById('inv-out')!;
  const empty = document.getElementById('inv-empty')!;
  const pre = document.getElementById('inv-text')!;
  const bar = document.getElementById('inv-bar') as HTMLProgressElement;
  const prog = document.getElementById('inv-prog')!;
  const say = (m: string) => (window as unknown as { aba?: { say: (s: string) => void } }).aba?.say?.(m);
  const lines = (a: HTMLTextAreaElement) => a.value.split('\n').map((l) => l.trim()).filter(Boolean);
  const count = () => {
    const n = areas.filter((a) => lines(a).length > 0).length;
    bar.value = n;
    prog.textContent = `Llenaste ${n} de ${areas.length} áreas.`;
    return n;
  };
  const build = () => {
    const parts = areas.filter((a) => lines(a).length).map((a) => `${a.dataset.area}:\n${lines(a).map((l) => `- ${l}`).join('\n')}`);
    return parts.length ? `MI INVENTARIO (sin nombres ni datos personales)\n\n${parts.join('\n\n')}` : '';
  };
  areas.forEach((a) => a.addEventListener('input', count));
  document.getElementById('inv-make')!.addEventListener('click', () => {
    const text = build();
    out.hidden = !text;
    empty.hidden = !!text;
    pre.textContent = text;
    if (text) out.scrollIntoView({ behavior: 'smooth', block: 'start' });
    else say('Escribe algo en al menos un área.');
  });
  document.getElementById('inv-clear')!.addEventListener('click', () => {
    areas.forEach((a) => { a.value = ''; });
    pre.textContent = '';
    out.hidden = true;
    empty.hidden = false;
    count();
    say('Borraste todo');
  });
  document.getElementById('inv-copy')!.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(pre.textContent ?? ''); say('Ficha copiada'); } catch { say('No se pudo copiar. Selecciona el texto y cópialo a mano.'); }
  });
  count();
}
