import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import fund from '../src/data/fundamentos-laborales.json';
import { materias } from '../src/data/dictamen-laboral';
import { register } from '../src/lib/claims.mjs';

const root = path.resolve(__dirname, '..');
const arts = fund.articulos as Record<string, any>;

describe('documento de revisión laboral', () => {
  const fichas = materias.flatMap((m) => m.fichas);
  it('cada ficha corresponde a una afirmación del registro', () => {
    for (const f of fichas) expect(register.some((c: any) => c.id === f.id), f.id).toBe(true);
  });
  it('cada ficha trae fundamento, lectura, puntos y pregunta', () => {
    for (const f of fichas) {
      expect(f.fundamento.length, f.id).toBeGreaterThan(0);
      expect(f.lectura.length, f.id).toBeGreaterThan(40);
      expect(f.abiertos.length, f.id).toBeGreaterThan(0);
      expect(f.pregunta.endsWith('?'), f.id).toBe(true);
    }
  });
  it('cada precepto citado existe, trae texto literal y un enlace directo a su página', () => {
    for (const f of fichas) for (const k of f.fundamento) {
      const a = arts[k];
      expect(a, k).toBeTruthy();
      expect(a.texto.length, k).toBeGreaterThan(40);
      expect(a.url, k).toMatch(/^https:\/\/www\.diputados\.gob\.mx\/LeyesBiblio\/pdf\/[A-Z]+\.pdf#page=\d+$/);
      expect(a.pagina, k).toBeGreaterThan(0);
    }
  });
  it('los textos citados no traen residuos de encabezado de página', () => {
    for (const [k, a] of Object.entries(arts)) expect(/CÁMARA DE DIPUTADOS|Última Reforma DOF/.test((a as any).texto), k).toBe(false);
  });
  it('el límite de 45 días de la conciliación se cita del Art. 684-D y el texto lo dice', () => {
    expect(arts['LFT-684-D'].texto).toMatch(/cuarenta y cinco días naturales/);
    for (const rel of ['src/pages/index.astro', 'src/data/directorio.json']) expect(fs.readFileSync(path.join(root, rel), 'utf8')).not.toContain('684-E');
  });
  it('el Art. 47 dice que la falta de aviso presume la separación no justificada', () => {
    expect(arts['LFT-47'].texto).toMatch(/presumirá la separación no justificada/);
    expect(arts['LFT-47'].texto).toMatch(/no comenzará a correr sino hasta que el trabajador reciba personalmente el aviso/);
  });
  it('las afirmaciones del documento tienen etiqueta y al menos una fuente con enlace https', () => {
    for (const f of fichas) {
      const c = (register as any[]).find((x) => x.id === f.id);
      expect(['verificado-primaria', 'verificado-secundaria', 'sin-verificar'], f.id).toContain(c.status);
      expect(c.sources.length, f.id).toBeGreaterThan(0);
      for (const s of c.sources) expect(s.url, f.id).toMatch(/^https:\/\//);
    }
  });
});
