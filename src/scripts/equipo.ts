const $ = (id: string) => document.getElementById(id) as HTMLInputElement;
const skills = Array.from(document.querySelectorAll<HTMLInputElement>('input[name=skill]'));

function update() {
  const n = Math.max(2, Math.min(200, Number($('e-n').value) || 2));
  const picked = skills.filter((s) => s.checked).map((s) => s.value);
  const msg = `Hola. Somos ${n} personas que estamos pensando en armar algo juntas: un trabajo nuevo, un negocio o una cooperativa. ¿Nos vemos en persona esta semana para platicarlo? Habilidades que ya tenemos: ${picked.length ? picked.join(', ') : 'por definir'}. Escríbeme por Signal, no por equipos del trabajo.`;
  $('e-msg').textContent = msg;
  const rows = picked.map((p) => `<tr><th scope="row">${p}</th><td></td><td></td><td></td></tr>`).join('');
  document.getElementById('e-matrix')!.innerHTML = `<div class="table-wrap"><table><thead><tr><th>Habilidad</th><th>Quién la tiene</th><th>Quién quiere aprender</th><th>Primer paso</th></tr></thead><tbody>${rows || '<tr><td colspan="4">Marca las habilidades arriba.</td></tr>'}</tbody></table></div>`;
  document.getElementById('e-copy')!.dataset.copy = msg;
}
['e-n'].forEach((id) => $(id).addEventListener('input', update));
skills.forEach((s) => s.addEventListener('change', update));
update();
