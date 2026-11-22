import vec from '../../tests/vectors.json';
import { calcular } from '../lib/calc';
import { fmtNum } from '../lib/format';

const out = document.getElementById('pruebas-out');
if (out) {
  let pass = 0, fail = 0;
  const rows: string[] = [];
  for (const v of vec.vectors) {
    const r = calcular({ ...(vec.base as any), ...(v.input as any) });
    const s = r[v.method as 'A' | 'B'];
    const got: Record<string, number> = { sdi: s.sdi, art439: s.exits.art439.total, art51: s.exits.art51.total, art48: s.exits.art48.total, premium: s.premium, isrExempt: s.isrExempt, cap: s.cap };
    for (const [k, e] of Object.entries(v.expect as Record<string, number>)) {
      const d = got[k] - e;
      const ok = Math.abs(d) <= vec.tolerance;
      ok ? pass++ : fail++;
      rows.push(`<tr><td>${v.id}</td><td>${k}</td><td>${fmtNum(e)}</td><td>${fmtNum(got[k])}</td><td>${fmtNum(d)}</td><td class="${ok ? 'pass' : 'fail'}"><strong>${ok ? 'PASS' : 'FAIL'}</strong></td></tr>`);
    }
  }
  out.innerHTML = `<p id="resumen"><strong>${pass} PASS, ${fail} FAIL</strong> (tolerancia ±${vec.tolerance.toFixed(2)} MXN)</p><div class="table-wrap"><table><thead><tr><th>Vector</th><th>Valor</th><th>Esperado</th><th>Calculado</th><th>Diferencia</th><th>Resultado</th></tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
}
