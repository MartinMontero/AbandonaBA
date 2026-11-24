// Enlaces para compartir. Son enlaces simples: no hay scripts, píxeles ni solicitudes a otras empresas hasta que la persona los toca.
// Instagram no ofrece un enlace para compartir una página: el botón copia el enlace y abre Instagram para pegarlo.
export type ShareId = 'whatsapp' | 'facebook' | 'x' | 'instagram';
export interface ShareLink { id: ShareId; label: string; aria: string; href: string; copy?: boolean }

export function shareLinks(url: string, title: string, es = true): ShareLink[] {
  const u = encodeURIComponent(url);
  const text = encodeURIComponent(title);
  const tab = es ? 'se abre en otra pestaña' : 'opens in a new tab';
  return [
    { id: 'whatsapp', label: es ? 'Enviar por WhatsApp' : 'Send on WhatsApp', aria: `${es ? 'Enviar por WhatsApp' : 'Send on WhatsApp'} (${tab})`, href: `https://wa.me/?text=${text}%20${u}` },
    { id: 'facebook', label: 'Facebook', aria: `${es ? 'Compartir en Facebook' : 'Share on Facebook'} (${tab})`, href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
    { id: 'x', label: 'X', aria: `${es ? 'Compartir en X' : 'Share on X'} (${tab})`, href: `https://x.com/intent/post?url=${u}&text=${text}` },
    { id: 'instagram', label: 'Instagram', aria: `${es ? 'Copiar el enlace y abrir Instagram' : 'Copy the link and open Instagram'} (${tab})`, href: 'https://www.instagram.com/', copy: true },
  ];
}

/** Páginas donde compartir no tiene sentido: la de error y las de revisión (no existen en producción). */
export const canShare = (path: string): boolean => path !== '/404/' && !path.startsWith('/revision');
