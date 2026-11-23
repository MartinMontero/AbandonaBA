// Configuración del sitio. Los textos largos viven en src/content; aquí solo valores de configuración.
export interface LegalReview { status: 'pendiente' | 'firmada'; reviewers: string[]; fecha: string | null }

export const legalReview: LegalReview = { status: 'pendiente', reviewers: [], fecha: null };

// El build falla si se marca "firmada" sin revisores y fecha.
if (legalReview.status === 'firmada' && (legalReview.reviewers.length < 1 || !legalReview.fecha)) {
  throw new Error('legalReview.status = "firmada" exige al menos un revisor y una fecha.');
}

export const siteConfig = {
  name: 'Abandona Banco Azteca',
  siteUrl: 'https://abandonabancoazteca.mx',
  repoUrl: 'https://github.com/MartinMontero/AbandonaBA',
  issuesUrl: 'https://github.com/MartinMontero/AbandonaBA/issues',
  quickExitUrl: 'https://www.google.com/',
  bankWarning: 'No uses equipos, Wi-Fi ni internet del banco para entrar a esta página.',
  legalNote: 'Información general. En revisión por abogado laboral. No es asesoría legal.',
  reviewBanner: 'VERSIÓN DE REVISIÓN PARA ABOGADOS. Borrador sin publicar. Los textos y valores están pendientes de su dictamen.',
  assumptions: 'Estimación con valores de 2026. Pendiente de revisión legal. Lleva esta hoja a PROFEDET.',
  disclaimer: 'Esta página ofrece información general sobre derechos laborales. No es asesoría legal ni crea una relación abogado-cliente. No está afiliada a Banco Azteca ni a Grupo Salinas. Verifica siempre con PROFEDET o con un abogado laboral.',
  footerLine: 'No afiliado a Banco Azteca ni a Grupo Salinas.',
  heroTitle: 'Si decides irte, sal bien.',
  heroSub: 'Calcula primero. No firmes en blanco ni bajo presión. Elige la ruta que conserva tus derechos.',
  heroAlt: 'No renuncies ni firmes nada bajo presión sin calcular antes.',
};

export const isReview = (import.meta as any).env?.REVIEW_MODE === '1' || (typeof process !== 'undefined' && process.env?.REVIEW_MODE === '1');

export const statusLabels = {
  'verificado-primaria': 'Verificado en la fuente oficial',
  'verificado-secundaria': 'Verificado solo en prensa o sitios de terceros',
  'sin-verificar': 'Sin verificar',
} as const;
export type Status = keyof typeof statusLabels;
