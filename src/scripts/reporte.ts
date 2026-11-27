// Controlador del formulario ciudadano de reporte de errores en /acerca/#errores.

export function initReportForm(): void {
  const form = document.getElementById('rep-form') as HTMLFormElement | null;
  if (!form) return;

  if (window.location.hash === '#errores') {
    const acc = document.getElementById('errores') as HTMLDetailsElement | null;
    if (acc) acc.open = true;
  }

  const tipoEl = document.getElementById('rep-tipo') as HTMLSelectElement | null;
  const paginaEl = document.getElementById('rep-pagina') as HTMLSelectElement | null;
  const tituloEl = document.getElementById('rep-titulo') as HTMLInputElement | null;
  const detalleEl = document.getElementById('rep-detalle') as HTMLTextAreaElement | null;
  const countEl = document.getElementById('rep-count');
  const confirmEl = document.getElementById('rep-confirm') as HTMLInputElement | null;
  const webEl = document.getElementById('rep-web') as HTMLInputElement | null;
  const submitBtn = document.getElementById('rep-submit') as HTMLButtonElement | null;
  const statusEl = document.getElementById('rep-status');
  const resetBtn = document.getElementById('rep-reset') as HTMLButtonElement | null;

  const updateCount = () => {
    if (countEl && detalleEl) countEl.textContent = String(detalleEl.value.length);
  };
  detalleEl?.addEventListener('input', updateCount);
  updateCount();

  const showStatus = (kind: 'ok' | 'err', msg: string) => {
    if (!statusEl) return;
    statusEl.hidden = false;
    statusEl.className = kind === 'ok' ? 'callout info' : 'callout';
    statusEl.textContent = msg;
  };

  resetBtn?.addEventListener('click', () => {
    form.reset();
    updateCount();
    form.hidden = false;
    resetBtn.hidden = true;
    if (statusEl) statusEl.hidden = true;
    tituloEl?.focus();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!tipoEl || !tituloEl || !detalleEl || !confirmEl || !submitBtn) return;

    const titulo = tituloEl.value.trim();
    const detalle = detalleEl.value.trim();
    if (titulo.length < 5) {
      showStatus('err', 'Escribe un resumen corto de al menos 5 caracteres.');
      tituloEl.focus();
      return;
    }
    if (detalle.length < 10) {
      showStatus('err', 'Cuéntanos un poco más de detalle (al menos 10 caracteres).');
      detalleEl.focus();
      return;
    }
    if (!confirmEl.checked) {
      showStatus('err', 'Marca la casilla confirmando que no incluiste datos personales.');
      confirmEl.focus();
      return;
    }

    submitBtn.disabled = true;
    const prevLabel = submitBtn.textContent;
    submitBtn.textContent = 'Enviando…';

    try {
      const res = await fetch('/api/reporte', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: tipoEl.value,
          pagina: paginaEl?.value ?? '',
          titulo,
          detalle,
          confirmNoPersonal: confirmEl.checked,
          website: webEl?.value ?? '',
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; number?: number; detail?: string };
      if (!res.ok || !data.ok) {
        showStatus('err', data.detail ?? 'No pudimos enviar tu reporte. Intenta de nuevo en un minuto.');
        return;
      }

      const folio = data.number ? ` (folio #${data.number})` : '';
      showStatus('ok', `¡Gracias! Recibimos tu reporte${folio}. Lo revisaremos para corregir el sitio.`);
      form.hidden = true;
      if (resetBtn) resetBtn.hidden = false;
    } catch {
      showStatus('err', 'No hay conexión en este momento. Verifica tu internet e intenta de nuevo.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = prevLabel ?? 'Enviar reporte';
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initReportForm);
} else {
  initReportForm();
}
