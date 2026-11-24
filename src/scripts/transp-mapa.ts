// Mapa de conexiones. La página funciona sin esto: las piezas son enlaces a #n-pieza y el periodo son botones de opción.
// Este archivo solo marca la pieza actual y lleva el foco al panel para quien usa lector de pantalla.
const root = document.querySelector('.mapa');
if (root) {
  const chips = Array.from(root.querySelectorAll<HTMLAnchorElement>('a.chip'));
  const mark = (): string => {
    const id = location.hash.startsWith('#n-') && document.getElementById(location.hash.slice(1)) ? location.hash.slice(1) : 'n-utilidad';
    for (const c of chips) {
      const on = c.getAttribute('href') === `#${id}`;
      c.classList.toggle('on', on);
      if (on) c.setAttribute('aria-current', 'true'); else c.removeAttribute('aria-current');
    }
    return id;
  };
  mark();
  window.addEventListener('hashchange', () => {
    const id = mark();
    if (location.hash === `#${id}`) document.getElementById(id)?.focus({ preventScroll: true });
  });
}
