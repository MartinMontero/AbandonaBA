"""Extrae, de los textos vigentes publicados por la Cámara de Diputados, los artículos que cita el documento de revisión laboral.

Uso (PowerShell):  python scripts\\fundamentos-laborales.py
Requiere pdftotext (poppler). Descarga LFT, LSS y LISR de diputados.gob.mx a .cache\\sources (ignorada por git)
y escribe src\\data\\fundamentos-laborales.json con el texto literal, la página del PDF y el enlace directo a esa página.
Nada se copia a mano: si el texto vigente cambia, se vuelve a correr y el documento se actualiza.
"""
import json, os, re, subprocess, sys, urllib.request, datetime

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
CACHE = os.path.join(ROOT, '.cache', 'sources')
os.makedirs(CACHE, exist_ok=True)
LEYES = {
    'LFT': ('Ley Federal del Trabajo', 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LFT.pdf'),
    'LSS': ('Ley del Seguro Social', 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LSS.pdf'),
    'LISR': ('Ley del Impuesto sobre la Renta', 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LISR.pdf'),
}

# clave -> (ley, etiqueta de artículo, recorte opcional: (regex de inicio, regex de fin o None))
SPEC = {
    'LFT-5': ('LFT', '5', (r'Artículo 5o', r'I\. Trabajos para')), 'LFT-33': ('LFT', '33', None),
    'LFT-47': ('LFT', '47', (r'El patrón que despida a un trabajador deberá darle aviso escrito', None)),
    'LFT-48': ('LFT', '48', (r'Artículo 48', r'Los abogados, litigantes o representantes')),
    'LFT-50': ('LFT', '50', None), 'LFT-51': ('LFT', '51', None), 'LFT-52': ('LFT', '52', None),
    'LFT-59': ('LFT', '59', None), 'LFT-61': ('LFT', '61', None), 'LFT-66': ('LFT', '66', None),
    'LFT-76': ('LFT', '76', None), 'LFT-79': ('LFT', '79', None), 'LFT-80': ('LFT', '80', None),
    'LFT-84': ('LFT', '84', None), 'LFT-87': ('LFT', '87', None), 'LFT-89': ('LFT', '89', None),
    'LFT-110': ('LFT', '110', (r'Artículo 110', r'II\. Pago de la renta')),
    'LFT-162': ('LFT', '162', (r'Artículo 162', r'IV\. Para el pago de la prima')),
    'LFT-437': ('LFT', '437', None), 'LFT-438': ('LFT', '438', None), 'LFT-439': ('LFT', '439', (r'Artículo 439', r'TITULO OCTAVO')),
    'LFT-485': ('LFT', '485', None), 'LFT-486': ('LFT', '486', None),
    'LFT-516': ('LFT', '516', None), 'LFT-517': ('LFT', '517', None), 'LFT-518': ('LFT', '518', None), 'LFT-521': ('LFT', '521', None),
    'LFT-527': ('LFT', '527', (r'Artículo 527', r'1\. Textil')),
    'LFT-527-22': ('LFT', '527', (r'22\. Servicios de banca y crédito', r'II\. Empresas')),
    'LFT-684-B': ('LFT', '684-B', None), 'LFT-684-D': ('LFT', '684-D', (r'Artículo 684-D', r'A efecto de que el personal')),
    'LFT-685-Ter': ('LFT', '685 Ter', None),
    'LSS-109': ('LSS', '109', None), 'LSS-191': ('LSS', '191', None), 'LSS-198': ('LSS', '198', None),
    'LISR-93-XIII': ('LISR', '93', None),
}


def descargar(clave):
    nombre, url = LEYES[clave]
    pdf = os.path.join(CACHE, clave + '.pdf')
    if not os.path.exists(pdf):
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=120) as r, open(pdf, 'wb') as f:
            f.write(r.read())
    txt = os.path.join(CACHE, clave + '.txt')
    subprocess.run(['pdftotext', '-enc', 'UTF-8', '-layout', pdf, txt], check=True)
    return open(txt, encoding='utf-8').read(), url


def limpiar(s):
    s = s.replace('\f', '\n')
    s = re.sub(r'\n[^\n]*(?:CÁMARA DE DIPUTADOS|Secretaría General|Secretaría de Servicios Parlamentarios|Última Reforma DOF)[^\n]*', '\n', s)
    s = re.sub(r'\n[ \t]*\d+ de \d+[ \t]*(?=\n)', '\n', s)
    paras = [re.sub(r'\s+', ' ', p).strip() for p in re.split(r'\n\s*\n', s.strip())]
    return '\n\n'.join(p for p in paras if p)


def pagina(t, idx):
    return t.count('\f', 0, idx) + 1


def articulo(t, etiqueta):
    lab = re.escape(etiqueta).replace(r'\ ', r'\s+')
    m = re.search(r'\n[ \t]*Art[ií]culo\s+' + lab + r'\s*(?:o\.|º)?\s*[\.\-]', t)
    if not m:
        return None
    sig = re.search(r'\n[ \t]*Art[ií]culo\s+\d+[\s\-A-Za-zº\.o]*?[\.\-]', t[m.end():])
    fin = m.end() + (sig.start() if sig else 4000)
    return m.start(), t[m.start():fin]


def main():
    textos, urls, versiones = {}, {}, {}
    for k in LEYES:
        textos[k], urls[k] = descargar(k)
        v = re.search(r'[ÚU]ltima [Rr]eforma(?: publicada)?(?: en el)?(?: DOF)?\s*([0-9]{2}-[0-9]{2}-[0-9]{4})', textos[k][:3000])
        versiones[k] = v.group(1) if v else None
    out = {}
    for clave, (ley, et, recorte) in SPEC.items():
        t = textos[ley]
        if ley == 'LISR':
            m = re.search(r'\nArtículo 93\.', t)
            seg = t[m.end():m.end() + 80000]
            a = re.search(r'\nXIII\.\s', seg)
            b = re.search(r'\nXIV\.\s', seg[a.end():])
            ini, cuerpo = m.end() + a.start(), seg[a.start():a.end() + b.start()]
        else:
            r = articulo(t, et)
            if r is None:
                print('NO ENCONTRADO', clave, file=sys.stderr)
                continue
            ini, cuerpo = r
        texto = limpiar(cuerpo)
        if recorte:
            i = re.search(recorte[0], texto)
            if i:
                texto = texto[i.start():]
            if recorte[1]:
                j = re.search(recorte[1], texto[1:])
                if j:
                    texto = texto[:j.start() + 1].rstrip()
        pg = pagina(t, ini)
        out[clave] = dict(ley=ley, ley_nombre=LEYES[ley][0], articulo=et if ley != 'LISR' else '93, fracción XIII', pagina=pg, url=f'{urls[ley]}#page={pg}', texto=texto)
    res = dict(generado=datetime.date.today().isoformat(), versiones=versiones, leyes={k: dict(nombre=v[0], url=v[1]) for k, v in LEYES.items()}, articulos=out)
    with open(os.path.join(ROOT, 'src', 'data', 'fundamentos-laborales.json'), 'w', encoding='utf-8', newline='\n') as f:
        json.dump(res, f, ensure_ascii=False, indent=1)
    print('artículos extraídos:', len(out), 'versiones:', versiones)


main()
