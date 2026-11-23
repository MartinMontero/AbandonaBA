// Copia la instrucción de una tarjeta. Nada sale del aparato.
const say = (m: string) => (window as unknown as { aba?: { say: (s: string) => void } }).aba?.say?.(m);
document.querySelectorAll<HTMLButtonElement>('.lesson .copy').forEach((b) => {
  b.addEventListener('click', async () => {
    const text = b.parentElement?.querySelector('.ptext')?.textContent ?? '';
    try {
      await navigator.clipboard.writeText(text);
      b.textContent = 'Copiado';
      say('Instrucción copiada');
      setTimeout(() => { b.textContent = 'Copiar'; }, 2000);
    } catch {
      say('No se pudo copiar. Selecciona el texto y cópialo a mano.');
    }
  });
});
