import { describe, it, expect } from 'vitest';
import data from '../src/data/opiniones-empleados.json';

describe('opiniones de empleados: los datos son atribuidos, fechados y sin texto de reseñas', () => {
  const sources = (data.employers as any[]).flatMap((e) => e.sources.map((s: any) => ({ e: e.id, ...s })));
  it('hay empleadores y fuentes', () => { expect(data.employers.length).toBeGreaterThanOrEqual(6); expect(sources.length).toBeGreaterThan(8); });
  it('cada fuente trae https, fecha, herramienta, etiqueta y voz de plataforma', () => {
    for (const s of sources) {
      expect(s.url, s.e).toMatch(/^https:\/\//);
      expect(s.read_date, s.e).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(s.tool, s.e).toBeTruthy();
      expect(['verificado-primaria', 'verificado-secundaria', 'sin-verificar'], s.e).toContain(s.status);
      expect(s.voice, s.e).toBe('plataforma');
    }
  });
  it('las calificaciones están dentro de la escala y traen su número de reseñas cuando existen', () => {
    for (const s of sources) {
      if (s.rating !== null) { expect(s.rating, s.e).toBeGreaterThan(0); expect(s.rating, s.e).toBeLessThanOrEqual(s.scale); }
      if (s.review_count !== null) expect(Number.isInteger(s.review_count) && s.review_count >= 0, s.e).toBe(true);
    }
  });
  it('no se guarda texto de reseñas', () => {
    const banned = /(review_text|pros|cons|comment|reseña_texto|headline)/i;
    const walk = (o: any, p: string) => { if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) { expect(banned.test(k), p + '.' + k).toBe(false); walk(v, p + '.' + k); } };
    walk(data, 'opiniones');
  });
  it('lo que se bloqueó queda registrado con enlace y fecha', () => {
    for (const b of data.blocked as any[]) { expect(b.url).toMatch(/^https:\/\//); expect(b.read_date).toMatch(/^\d{4}-\d{2}-\d{2}$/); }
    expect((data.blocked as any[]).length).toBeGreaterThanOrEqual(2);
  });
});
