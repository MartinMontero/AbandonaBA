// Rutas del producto con contenido legal o de dinero (se usan en la hoja de dictamen y en la mesa de revisión).
export const legalRoutes: { path: string; title: string }[] = [
  { path: '/calculadora/', title: 'Calculadora' },
  { path: '/salidas/', title: 'Cuatro formas de salir' },
  { path: '/no-firmes/', title: 'No firmes esto' },
  { path: '/plazos/', title: 'Mis plazos' },
  { path: '/checklist-salida/', title: 'Checklist de salida' },
  { path: '/situacion/', title: 'Qué se dijo y qué no está confirmado' },
  { path: '/evidencia/', title: 'Guarda evidencia' },
  { path: '/ayuda-gratis/', title: 'Ayuda gratis' },
  { path: '/puente/', title: 'Dinero mientras encuentro trabajo' },
  { path: '/trabajo/', title: 'Buscar trabajo' },
  { path: '/negocio/', title: 'Mi propio negocio' },
  { path: '/equipo/', title: 'Con mis compañeros: equipo' },
  { path: '/cooperativa/', title: 'Cooperativa' },
  { path: '/transparencia/', title: 'Transparencia' },
  { path: '/transparencia/impuestos/', title: 'Transparencia: impuestos y tribunales' },
  { path: '/transparencia/sueldos/', title: 'Transparencia: sueldos' },
  { path: '/transparencia/directivos/', title: 'Transparencia: directivos' },
  { path: '/transparencia/utilidades/', title: 'Transparencia: utilidades' },
  { path: '/transparencia/dinero/', title: 'Transparencia: de dónde sale el dinero' },
];

export const decisions = [
  { id: 'D1', text: 'Art. 439: ¿«cuatro meses» son 120 días o 121.6 días (4 × 30.4)?', a: '120 días', b: '121.6 días', key: 'art439Days', va: 120, vb: 121.6 },
  { id: 'D2', text: 'Comisiones: ¿se dividen entre 7 o entre los días realmente trabajados a la semana?', a: 'entre 7 (método A)', b: 'entre 6 (método B)', key: 'method' },
  { id: 'D3', text: 'Vacaciones en el salario integrado: ¿las del último año completo o las del año en curso?', a: 'último año completo', b: 'año en curso', key: 'vacationBasis', va: 'completos', vb: 'encurso' },
  { id: 'D4', text: 'Pago variable: ¿promedio semanal o total de 30 días como ventana del promedio?', a: 'semanal', b: 'total de 30 días', key: 'commissionPeriod', va: 'semana', vb: 'treinta' },
  { id: 'D5', text: 'Fracciones de año: ¿solo años completos o proporcional?', a: 'solo completos', b: 'proporcional', key: 'fractionMode', va: 'completos', vb: 'proporcional' },
] as const;
