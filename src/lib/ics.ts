// Generador de .ics en el dispositivo. Eventos de día completo.
function esc(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}
function ymd(d: Date): string {
  return d.toISOString().slice(0, 10).replace(/-/g, '');
}
function fold(line: string): string {
  const out: string[] = [];
  let s = line;
  while (s.length > 73) { out.push(s.slice(0, 73)); s = ' ' + s.slice(73); }
  out.push(s);
  return out.join('\r\n');
}
export interface IcsEvent { uid: string; date: Date; summary: string; description?: string }

export function buildIcs(events: IcsEvent[], stamp: Date = new Date()): string {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//abandonabancoazteca//plazos//ES', 'CALSCALE:GREGORIAN'];
  const dtstamp = stamp.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  for (const e of events) {
    const next = new Date(e.date.getTime() + 86400000);
    lines.push('BEGIN:VEVENT', `UID:${esc(e.uid)}@abandonabancoazteca`, `DTSTAMP:${dtstamp}`, `DTSTART;VALUE=DATE:${ymd(e.date)}`, `DTEND;VALUE=DATE:${ymd(next)}`, `SUMMARY:${esc(e.summary)}`);
    if (e.description) lines.push(`DESCRIPTION:${esc(e.description)}`);
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}
