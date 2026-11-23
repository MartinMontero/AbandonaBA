// Ilustraciones propias (SVG), con los tokens de arte de src/styles/art.css. Todas son decorativas: aria-hidden en quien las usa.
const person = (x: number, y: number, k: number, skin: string, shirt: string, hair = 'ink') =>
  `<g transform="translate(${x} ${y}) scale(${k})"><rect x="-13" y="13" width="26" height="32" rx="12" class="f-${shirt}"/><circle cx="0" cy="0" r="11" class="f-${skin}"/><path d="M-11 -1a11 11 0 0 1 22 0c-6-7-16-7-22 0z" class="f-${hair}"/></g>`;
const star4 = (x: number, y: number, r: number, c = 'sun') => `<path d="M${x} ${y - r}L${x + r * 0.28} ${y - r * 0.28}L${x + r} ${y}L${x + r * 0.28} ${y + r * 0.28}L${x} ${y + r}L${x - r * 0.28} ${y + r * 0.28}L${x - r} ${y}L${x - r * 0.28} ${y - r * 0.28}Z" class="f-${c}"/>`;
const ground = `<ellipse cx="80" cy="108" rx="52" ry="7" class="f-shadow"/>`;

export const spots: Record<string, string> = {
  shield: `<circle cx="80" cy="58" r="50" class="f-s3 o3"/>${ground}
    <g transform="rotate(-12 34 70)"><rect x="14" y="40" width="40" height="52" rx="6" class="f-paper"/><path d="M22 54h24M22 64h24M22 74h16" class="s-s3 sw3"/></g>
    <path d="M86 14l40 15v32c0 23-17 38-40 46-23-8-40-23-40-46V29z" class="f-n2"/>
    <path d="M86 24l30 11v26c0 17-12 29-30 35-18-6-30-18-30-35V35z" class="f-s2"/>
    <path d="M70 62l12 12 22-26" class="s-foam sw8"/>${star4(132, 26, 9)}${star4(22, 24, 6, 'd2')}${star4(140, 84, 5, 'coral')}`,
  calc: `<circle cx="80" cy="58" r="50" class="f-d2 o3"/>${ground}
    <rect x="42" y="14" width="76" height="94" rx="12" class="f-n2"/>
    <rect x="50" y="22" width="60" height="24" rx="6" class="f-light"/><path d="M58 38h28M58 30h14" class="s-n2 sw3"/><circle cx="98" cy="34" r="7" class="f-sun"/>
    <g class="f-s3"><rect x="50" y="54" width="16" height="14" rx="4"/><rect x="72" y="54" width="16" height="14" rx="4"/><rect x="94" y="54" width="16" height="14" rx="4"/><rect x="50" y="74" width="16" height="14" rx="4"/><rect x="72" y="74" width="16" height="14" rx="4"/></g>
    <rect x="94" y="74" width="16" height="28" rx="4" class="f-coral"/><rect x="50" y="94" width="38" height="8" rx="4" class="f-foam"/>
    <ellipse cx="136" cy="100" rx="16" ry="6" class="f-d1"/><ellipse cx="136" cy="94" rx="16" ry="6" class="f-sun"/><ellipse cx="136" cy="87" rx="16" ry="6" class="f-d1"/><ellipse cx="136" cy="81" rx="16" ry="6" class="f-sun"/>
    <path d="M24 106c0-14 6-22 14-26-2 10-4 18-14 26z" class="f-leaf"/><path d="M24 106c-2-10-8-14-14-14 2 10 8 14 14 14z" class="f-leaf o7"/>`,
  calendar: `<circle cx="80" cy="58" r="50" class="f-s3 o3"/>${ground}
    <rect x="30" y="20" width="96" height="86" rx="12" class="f-paper"/><path d="M30 32a12 12 0 0 1 12-12h72a12 12 0 0 1 12 12v14H30z" class="f-coral"/>
    <rect x="48" y="12" width="8" height="18" rx="4" class="f-n2"/><rect x="100" y="12" width="8" height="18" rx="4" class="f-n2"/>
    <g class="f-s3 o5"><rect x="42" y="56" width="16" height="12" rx="4"/><rect x="70" y="56" width="16" height="12" rx="4"/><rect x="98" y="56" width="16" height="12" rx="4"/><rect x="42" y="76" width="16" height="12" rx="4"/><rect x="98" y="76" width="16" height="12" rx="4"/></g>
    <path d="M73 62l4 4 8-9" class="s-leaf sw3"/><circle cx="108" cy="92" r="22" class="f-sun"/><circle cx="108" cy="92" r="17" class="f-light"/><path d="M108 80v12l8 5" class="s-n2 sw3"/>`,
  door: `<circle cx="80" cy="58" r="50" class="f-d2 o3"/>${ground}
    <path d="M30 108V22a8 8 0 0 1 8-8h60a8 8 0 0 1 8 8v86z" class="f-n2"/><path d="M40 108V26h54v82z" class="f-light"/>
    <path d="M40 26l-14 8v74l14-0z" class="f-s2"/><path d="M94 26h0" class="f-none"/>
    <path d="M94 108L150 108 118 84 94 70z" class="f-sun o5"/><path d="M94 26L150 98" class="s-sun sw3 o5"/>
    ${person(70, 52, 0.9, 'k2', 'coral')}<circle cx="46" cy="70" r="3" class="f-sun"/>${star4(138, 30, 8, 'sun')}`,
  clipboard: `<circle cx="80" cy="58" r="50" class="f-s3 o3"/>${ground}
    <rect x="38" y="16" width="84" height="92" rx="12" class="f-sand"/><rect x="48" y="26" width="64" height="76" rx="6" class="f-paper"/>
    <rect x="62" y="10" width="36" height="16" rx="8" class="f-n2"/>
    <g class="sw3 s-leaf"><path d="M56 44l4 4 8-9"/><path d="M56 64l4 4 8-9"/></g><path d="M78 44h26M78 64h26M56 84h48" class="s-s3 sw3"/>
    <path d="M110 82l22-22 8 8-22 22-12 4z" class="f-coral"/><path d="M132 60l4-4 8 8-4 4z" class="f-d2"/>`,
  help: `<circle cx="80" cy="58" r="50" class="f-s3 o3"/>${ground}
    <path d="M26 20h66a12 12 0 0 1 12 12v26a12 12 0 0 1-12 12H58l-18 16V70H26a12 12 0 0 1-12-12V32a12 12 0 0 1 12-12z" class="f-s2"/>
    <path d="M30 40h48M30 52h32" class="s-foam sw5"/>
    <path d="M98 58h38a12 12 0 0 1 12 12v22a12 12 0 0 1-12 12h-8v14l-14-14H98a12 12 0 0 1-12-12V70a12 12 0 0 1 12-12z" class="f-sun"/>
    <path d="M116 86c-8-6-12-10-8-15 3-3 7-2 8 1 1-3 5-4 8-1 4 5 0 9-8 15z" class="f-coral"/>${star4(136, 26, 8, 'coral')}`,
  steps: `<circle cx="80" cy="58" r="50" class="f-d2 o3"/>${ground}
    <rect x="18" y="84" width="30" height="24" rx="4" class="f-s3"/><rect x="48" y="68" width="30" height="40" rx="4" class="f-s2"/><rect x="78" y="52" width="30" height="56" rx="4" class="f-s1"/><rect x="108" y="34" width="30" height="74" rx="4" class="f-n2"/>
    <path d="M30 70l22-16 18 8 40-34" class="s-coral sw5"/><path d="M104 22l14 2-2 14z" class="f-coral"/>${star4(124, 18, 8)}${star4(24, 40, 5, 'd1')}`,
  briefcase: `<circle cx="80" cy="58" r="50" class="f-d2 o3"/>${ground}
    <path d="M24 90l24-22 18 14 28-34 24 18" class="s-leaf sw5"/><path d="M110 40l10 6 2-12" class="s-leaf sw5"/>
    <rect x="34" y="46" width="92" height="56" rx="12" class="f-n2"/><path d="M62 46V38a8 8 0 0 1 8-8h20a8 8 0 0 1 8 8v8" class="f-none s-n2 sw5"/>
    <rect x="34" y="70" width="92" height="6" class="f-s2"/><rect x="72" y="64" width="16" height="18" rx="4" class="f-sun"/>${star4(138, 22, 8)}${star4(20, 42, 6, 'coral')}`,
  store: `<circle cx="80" cy="58" r="50" class="f-s3 o3"/>${ground}
    <rect x="34" y="50" width="92" height="58" rx="4" class="f-sand"/>
    <path d="M28 26h104l8 26a14 14 0 0 1-28 0 14 14 0 0 1-28 0 14 14 0 0 1-28 0 14 14 0 0 1-28 0z" class="f-coral"/>
    <path d="M54 26l-6 26M80 26v26M106 26l6 26" class="s-paper sw5 o7"/>
    <rect x="68" y="72" width="24" height="36" rx="4" class="f-n2"/><rect x="42" y="68" width="20" height="20" rx="4" class="f-light"/><rect x="98" y="68" width="20" height="20" rx="4" class="f-light"/><circle cx="86" cy="92" r="2.5" class="f-sun"/>`,
  people: `<circle cx="80" cy="58" r="50" class="f-d2 o3"/>${ground}
    ${person(48, 50, 1, 'k2', 's2')}${person(80, 42, 1.1, 'k1', 'coral', 'k3')}${person(112, 50, 1, 'k3', 'n2')}
    <path d="M58 82c8 8 12 8 20 0M82 82c8 8 12 8 20 0" class="s-sun sw3"/>${star4(24, 24, 7, 'sun')}${star4(138, 20, 6, 'coral')}`,
  coop: `<ellipse cx="80" cy="108" rx="50" ry="7" class="f-shadow"/>
    <circle cx="62" cy="52" r="34" class="f-s2 o85"/><circle cx="98" cy="52" r="34" class="f-sun o85"/><circle cx="80" cy="82" r="34" class="f-coral o85"/>
    <path d="M80 60l5 10h11l-9 7 3 11-10-7-10 7 3-11-9-7h11z" class="f-paper"/>`,
  spark: `<circle cx="80" cy="58" r="50" class="f-s3 o3"/>${ground}
    <path d="M28 24h80a12 12 0 0 1 12 12v32a12 12 0 0 1-12 12H66l-20 18V80h-18a12 12 0 0 1-12-12V36a12 12 0 0 1 12-12z" class="f-n2"/>
    <path d="M44 44h48M44 58h32" class="s-s3 sw5"/>${star4(120, 30, 18)}${star4(142, 64, 9, 'd1')}${star4(24, 100, 6, 'coral')}`,
  news: `<circle cx="80" cy="58" r="50" class="f-d2 o3"/>${ground}
    <rect x="26" y="20" width="84" height="88" rx="8" class="f-paper"/><rect x="34" y="28" width="68" height="14" rx="4" class="f-n2"/>
    <path d="M34 54h30M34 64h30M34 74h30M34 84h30M72 54h30M72 64h30" class="s-s3 sw3"/>
    <circle cx="106" cy="78" r="20" class="f-light o85"/><circle cx="106" cy="78" r="20" class="f-none s-coral sw5"/><path d="M121 93l16 16" class="s-coral sw8"/>`,
  book: `<circle cx="80" cy="58" r="50" class="f-s3 o3"/>${ground}
    <path d="M80 30C64 20 44 20 28 26v66c16-6 36-6 52 4z" class="f-paper"/><path d="M80 30c16-10 36-10 52-4v66c-16-6-36-6-52 4z" class="f-light"/>
    <path d="M38 42c10-3 24-3 34 2M38 56c10-3 24-3 34 2M88 44c10-5 24-5 34-2M88 58c10-5 24-5 34-2" class="s-s3 sw3"/>${star4(132, 20, 8)}`,
};

// Íconos de puesto (96x96)
export const roles: Record<string, string> = {
  cajero: `<circle cx="48" cy="48" r="46" class="f-s3 o3"/><rect x="14" y="58" width="68" height="22" rx="6" class="f-n2"/><rect x="14" y="52" width="68" height="10" rx="4" class="f-s2"/>${person(48, 36, 0.95, 'k2', 'coral')}<rect x="60" y="44" width="14" height="10" rx="3" class="f-sun"/>`,
  asesor: `<circle cx="48" cy="48" r="46" class="f-d2 o3"/>${person(38, 34, 1, 'k1', 's2', 'k3')}<rect x="52" y="44" width="30" height="24" rx="5" class="f-n2"/><path d="M57 62l6-8 5 4 8-10" class="s-sun sw3"/><rect x="18" y="70" width="48" height="8" rx="4" class="f-n2 o5"/>`,
  cobranza: `<circle cx="48" cy="48" r="46" class="f-s3 o3"/><circle cx="26" cy="68" r="11" class="f-none s-n2 sw5"/><circle cx="70" cy="68" r="11" class="f-none s-n2 sw5"/><path d="M26 68l14-20h22l8 20M40 48l-4-8h-8M54 48l6-14h10" class="s-coral sw5"/>${person(50, 28, 0.62, 'k2', 'sun')}`,
  verificador: `<circle cx="48" cy="48" r="46" class="f-d2 o3"/><rect x="22" y="16" width="40" height="52" rx="6" class="f-paper"/><path d="M30 28h24M30 38h24M30 48h14" class="s-s3 sw3"/><circle cx="60" cy="58" r="16" class="f-light o85"/><circle cx="60" cy="58" r="16" class="f-none s-n2 sw5"/><path d="M72 70l12 12" class="s-n2 sw8"/><path d="M53 58l5 5 9-10" class="s-leaf sw3"/>`,
  gerente: `<circle cx="48" cy="48" r="46" class="f-s3 o3"/>${person(42, 32, 1.05, 'k3', 'n2')}<rect x="54" y="44" width="26" height="34" rx="5" class="f-sand"/><rect x="60" y="40" width="14" height="8" rx="3" class="f-s2"/><path d="M59 58l4 4 7-8M59 70h16" class="s-leaf sw3"/><path d="M26 74l4-8 4 8" class="s-sun sw3"/>`,
  oficinas: `<circle cx="48" cy="48" r="46" class="f-d2 o3"/><rect x="22" y="18" width="34" height="62" rx="4" class="f-n2"/><rect x="52" y="36" width="24" height="44" rx="4" class="f-s2"/><g class="f-light"><rect x="28" y="26" width="8" height="8" rx="2"/><rect x="42" y="26" width="8" height="8" rx="2"/><rect x="28" y="42" width="8" height="8" rx="2"/><rect x="42" y="42" width="8" height="8" rx="2"/><rect x="28" y="58" width="8" height="8" rx="2"/><rect x="58" y="44" width="8" height="8" rx="2"/><rect x="58" y="58" width="8" height="8" rx="2"/></g><rect x="40" y="66" width="10" height="14" rx="2" class="f-sun"/>`,
};

const card = (x: number, y: number, w: number, h: number) => `<rect x="${x}" y="${y + 8}" width="${w}" height="${h}" rx="18" class="f-shadow"/><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="18" class="f-paper"/>`;
// Composición de portada: personas, luz de amanecer y tarjetas de producto (sin cifras ni texto legal).
export const heroScene = `
<circle cx="350" cy="200" r="190" class="f-d2 o5"/><circle cx="350" cy="200" r="136" class="f-sun o85"/><circle cx="350" cy="200" r="206" class="f-none s-d1 sw2 o3"/>
<path d="M20 420C120 400 200 330 280 270s160-120 250-170" class="s-s3 sw3" stroke-dasharray="2 12"/><path d="M522 82l24-6-8 24z" class="f-s3"/>
<ellipse cx="290" cy="440" rx="250" ry="14" class="f-shadow"/>
${person(176, 300, 2.1, 'k2', 's2')}${person(296, 280, 2.45, 'k1', 'coral', 'k3')}${person(416, 302, 2.1, 'k3', 'n2')}
${card(8, 64, 196, 108)}<circle cx="38" cy="96" r="14" class="f-s2"/><path d="M31 96l5 5 9-10" class="s-foam sw3"/><path d="M60 90h116" class="s-s3 sw5"/><path d="M24 128h156M24 146h108" class="s-n2 sw3 o3"/>
${card(366, 28, 178, 98)}<rect x="382" y="46" width="34" height="34" rx="8" class="f-coral"/><rect x="382" y="58" width="34" height="22" rx="6" class="f-paper"/><path d="M394 66l4 4 8-9" class="s-leaf sw3"/><path d="M428 54h92M428 70h64" class="s-n2 sw3 o3"/><rect x="382" y="98" width="140" height="10" rx="5" class="f-foam"/><rect x="382" y="98" width="88" height="10" rx="5" class="f-sun"/>
${card(346, 330, 206, 104)}<circle cx="380" cy="364" r="18" class="f-n2"/><path d="M372 364h16M380 356v16" class="s-sun sw3"/><path d="M410 356h110M410 372h76" class="s-n2 sw3 o3"/><rect x="368" y="394" width="150" height="24" rx="12" class="f-leaf"/><path d="M384 406l5 5 10-10" class="s-paper sw3"/><text x="408" y="411" class="f-paper" font-size="13" font-weight="700">Encaja muy bien</text>
<circle cx="52" cy="352" r="34" class="f-n2"/><path d="M52 332l22 8v18c0 14-10 22-22 27-12-5-22-13-22-27v-18z" class="f-s2"/><path d="M42 358l8 8 14-16" class="s-foam sw5"/>
${star4(262, 70, 14)}${star4(520, 260, 10, 'coral')}${star4(40, 250, 8, 'd1')}${star4(486, 380, 7)}
`;