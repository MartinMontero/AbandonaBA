// Avance de la lista de salida. No guarda nada: al cerrar la página se borra.
const boxes = Array.from(document.querySelectorAll<HTMLInputElement>('.chk-item input[type="checkbox"]'));
const bar = document.getElementById('chk-bar') as HTMLProgressElement | null;
const text = document.getElementById('chk-text');
function update() {
  const done = boxes.filter((b) => b.checked).length;
  boxes.forEach((b) => b.closest('.chk-item')?.classList.toggle('done', b.checked));
  if (bar) bar.value = done;
  if (text) text.textContent = done === boxes.length ? `Revisaste los ${boxes.length}. Buen trabajo.` : `Revisaste ${done} de ${boxes.length}.`;
}
boxes.forEach((b) => b.addEventListener('change', update));
update();
