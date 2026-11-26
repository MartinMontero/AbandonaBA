"""Parser determinista del PDF de la Ley Federal del Trabajo publicado por la Cámara de Diputados.

Convierte el PDF en `ArticleChunk`s con metadatos jerárquicos (título, capítulo, sección), estado de derogación
a nivel artículo, fecha de la última reforma DOF y aislamiento de transitorios por decreto.
No usa modelos: mismas entradas, mismas salidas.
"""
from __future__ import annotations

import re
import unicodedata
from collections.abc import Callable, Iterable, Sequence
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Literal

LawCode = Literal["LFT", "LSS"]
TokenCounter = Callable[[str], int]

# ---------------------------------------------------------------------------
# Identificadores canónicos de artículo
# ---------------------------------------------------------------------------

_ADVERBIALS: dict[str, str] = {
    "bis": "Bis",
    "ter": "Ter",
    "quater": "Quáter",
    "cuater": "Quáter",
    "quinquies": "Quinquies",
    "sexies": "Sexies",
    "septies": "Septies",
    "octies": "Octies",
    "nonies": "Nonies",
    "novies": "Nonies",
    "decies": "Decies",
}
_ADV_RE = r"(?:Bis|Ter|Qu[áa]ter|Cu[áa]ter|Quinquies|Sexies|Septies|Octies|Nonies|Novies|Decies)"

# Núcleo de un identificador: 512-D Bis, 3o. Bis, 15-A, 5 A, 1º, Único
ARTICLE_ID_CORE = (
    r"(?:(?P<num>\d{1,4})\s*(?:o\.?|º\.?|°\.?)?"
    r"(?:\s*(?:-\s*|\s+(?=[A-ZÑ](?:\s+(?:" + _ADV_RE + r")|[.\-–]|$)))(?P<letter>[A-ZÑ])(?![a-záéíóúñ]))?"
    rf"(?:\s+(?P<adv>{_ADV_RE})(?![a-záéíóú]))?"
    r"|(?P<unico>[ÚU]nico))"
)

_HEAD_RE = re.compile(
    r"^\s*Art[íi]culo\s+" + ARTICLE_ID_CORE + r"\s*(?:\.\s*-|\.|-)\s*(?P<rest>.*)$",
    re.IGNORECASE,
)


def _fold(s: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")


def normalize_articulo_id(raw: str) -> str:
    """Canonicaliza un identificador de artículo de la LFT.

    >>> normalize_articulo_id("Artículo 3o. Bis")
    '3 Bis'
    >>> normalize_articulo_id("15-a")
    '15-A'
    >>> normalize_articulo_id("512-D bis")
    '512-D Bis'
    """
    s = raw.strip()
    s = re.sub(r"^(?:art[íi]culos?|arts?\.)\s*", "", s, flags=re.IGNORECASE)
    s = s.strip().rstrip(".-–: ").strip()
    m = re.fullmatch(
        r"(?P<num>\d{1,4})\s*(?:o\.?|º\.?|°\.?)?\s*(?:-?\s*(?P<letter>[A-Za-zÑñ])(?![a-záéíóúñ]))?"
        rf"\s*(?P<adv>{_ADV_RE})?\.?",
        s,
        flags=re.IGNORECASE,
    )
    if m:
        out = m.group("num").lstrip("0") or "0"
        if m.group("letter"):
            out += "-" + m.group("letter").upper()
        if m.group("adv"):
            out += " " + _ADVERBIALS[_fold(m.group("adv")).lower()]
        return out
    if _fold(s).lower() in {"unico", "único"}:
        return "Único"
    # Transitorios y otros identificadores compuestos se devuelven con espacios normalizados.
    return re.sub(r"\s+", " ", s)


def _id_from_match(m: re.Match[str]) -> tuple[str, str]:
    """Devuelve (id_canónico, etiqueta tal como aparece) a partir de un match de ARTICLE_ID_CORE."""
    if m.group("unico"):
        return "Único", "Único"
    num = m.group("num").lstrip("0") or "0"
    canon = num
    if m.group("letter"):
        canon += "-" + m.group("letter").upper()
    if m.group("adv"):
        canon += " " + _ADVERBIALS[_fold(m.group("adv")).lower()]
    return canon, canon


# ---------------------------------------------------------------------------
# Limpieza de páginas
# ---------------------------------------------------------------------------

_BOILERPLATE = [
    re.compile(r"^\s*LEY FEDERAL DEL TRABAJO\s*$"),
    re.compile(r"^\s*LEY DEL SEGURO SOCIAL\s*$"),
    re.compile(r"^\s*C[ÁA]MARA DE DIPUTADOS DEL H\. CONGRESO DE LA UNI[ÓO]N\s*$", re.IGNORECASE),
    re.compile(r"^\s*Secretar[íi]a General\s*$"),
    re.compile(r"^\s*Secretar[íi]a de Servicios Parlamentarios\s*$"),
    re.compile(r"^\s*Direcci[óo]n General de Servicios de Documentaci[óo]n.*$"),
    re.compile(r"^\s*[ÚU]ltima Reforma DOF \d{2}-\d{2}-\d{4}\s*$", re.IGNORECASE),
    re.compile(r"^\s*TEXTO VIGENTE\s*$"),
    re.compile(r"^\s*[ÚU]ltima reforma publicada (?:DOF )?\d{2}-\d{2}-\d{4}\s*$", re.IGNORECASE),
    re.compile(r"^\s*\d{1,4}\s+de\s+\d{1,4}\s*$"),
    re.compile(r"^\s*-\s*\d{1,4}\s*-\s*$"),
    re.compile(r"^\s*\d{1,4}\s*$"),
]
_BULLET_CHARS = "•"


def clean_page(text: str) -> list[str]:
    """Quita encabezados y pies de página repetidos y devuelve las líneas restantes (sin espacios finales)."""
    out: list[str] = []
    for line in text.replace("\r", "").split("\n"):
        line = line.rstrip()
        for ch in _BULLET_CHARS:
            line = line.replace(ch, "•")
        if any(p.match(line) for p in _BOILERPLATE):
            continue
        out.append(line)
    return out


def extract_pages(pdf_path: str | Path) -> list[str]:
    import pymupdf

    with pymupdf.open(str(pdf_path)) as doc:
        return [page.get_text("text") for page in doc]


def extract_reform_version(pages: Sequence[str]) -> str:
    """Fecha de la última reforma del texto vigente (encabezado del PDF)."""
    for page in pages[:2]:
        m = re.search(r"[ÚU]ltima Reforma DOF (\d{2}-\d{2}-\d{4})", page, re.IGNORECASE)
        if m:
            return m.group(1)
    return ""


# ---------------------------------------------------------------------------
# Modelo de datos
# ---------------------------------------------------------------------------


@dataclass
class ArticleChunk:
    chunk_id: str
    articulo_id: str
    articulo_label: str
    text: str
    body: str
    law_code: LawCode = "LFT"
    titulo: str = ""
    capitulo: str = ""
    seccion: str = ""
    is_derogado: bool = False
    is_transitorio: bool = False
    reform_date: str = ""
    decreto: str = ""
    decreto_num: int = 0
    part_index: int = 1
    part_total: int = 1
    page_start: int = 0

    def metadata(self) -> dict[str, str | int | bool]:
        """Metadatos primitivos seguros para ChromaDB (sin None)."""
        md = asdict(self)
        md.pop("text")
        md.pop("body")
        md.pop("chunk_id")
        return {k: ("" if v is None else v) for k, v in md.items()}


@dataclass
class _Article:
    articulo_id: str
    label: str
    titulo: str
    capitulo: str
    seccion: str
    page: int
    is_transitorio: bool = False
    decreto: str = ""
    decreto_num: int = 0
    lines: list[str] = field(default_factory=list)


# ---------------------------------------------------------------------------
# Notas DOF, derogación y fechas
# ---------------------------------------------------------------------------

_DATE_RE = re.compile(r"\b(\d{2})-(\d{2})-(\d{4})\b")
_NOTE_RE = re.compile(
    r"^\s*(?:Art[íi]culo|P[áa]rrafos?|Fracci[óo]n(?:es)?|Incisos?|Numerales?|Apartados?|Cap[íi]tulo|T[íi]tulo|"
    r"Secci[óo]n|Denominaci[óo]n|Fe de erratas|Reforma|Bases?|Sub-?incisos?|Ep[íi]grafe|Ordenamiento|Ley)"
    r"\b[^\n]{0,160}\bDOF\s+\d{2}-\d{2}-\d{4}",
    re.IGNORECASE,
)
_SE_DEROGA_RE = re.compile(r"^\(?\s*se\s+deroga\s*\.?\s*\)?\s*\.?$", re.IGNORECASE)


def latest_dof_date(text: str) -> str:
    """Devuelve la fecha DD-MM-YYYY más reciente encontrada en `text` ("" si no hay)."""
    best: tuple[int, int, int] | None = None
    best_s = ""
    for d, m, y in _DATE_RE.findall(text):
        key = (int(y), int(m), int(d))
        if best is None or key > best:
            best, best_s = key, f"{d}-{m}-{y}"
    return best_s


def is_note_line(line: str) -> bool:
    return bool(_NOTE_RE.match(line))


def article_is_derogado(substantive_body: str, notes: Sequence[str]) -> bool:
    """True sólo si TODO el artículo está derogado (no una fracción suelta)."""
    body = re.sub(r"\s+", " ", substantive_body).strip()
    if _SE_DEROGA_RE.match(body):
        return True
    if body:
        return False
    # Cuerpo vacío: decide la nota "Artículo derogado DOF ..." si no hubo una adición posterior.
    for n in notes:
        if re.match(r"^\s*Art[íi]culo derogado DOF", n, re.IGNORECASE) and not re.search(
            r"adicionad|reformad", n, re.IGNORECASE
        ):
            return True
    return False


# ---------------------------------------------------------------------------
# Reconstrucción de párrafos
# ---------------------------------------------------------------------------

_ROMAN_ONLY = re.compile(r"^\s*[IVXLCDM]+\.\s*$")
_INCISO_ONLY = re.compile(r"^\s*[a-zñ]\)\s*$")
_FRACCION_START = re.compile(r"^\s*[IVXLCDM]+\.\s+\S")


def _paragraphs(lines: Sequence[str]) -> list[str]:
    """Une líneas cortadas por el PDF en párrafos. Las notas DOF quedan como párrafos propios."""
    paras: list[str] = []
    cur: list[str] = []
    pending_marker = ""

    def flush() -> None:
        nonlocal cur
        if cur:
            paras.append(re.sub(r"\s+", " ", " ".join(cur)).strip())
            cur = []

    for raw in lines:
        line = raw.strip()
        if not line:
            if not pending_marker:
                flush()
            continue
        if _ROMAN_ONLY.match(line) or _INCISO_ONLY.match(line):
            flush()
            pending_marker = line.strip()
            continue
        if pending_marker:
            line = f"{pending_marker} {line}"
            pending_marker = ""
            flush()
        if is_note_line(line):
            flush()
            paras.append(re.sub(r"\s+", " ", line).strip())
            continue
        cur.append(line)
    if pending_marker:
        cur.append(pending_marker)
    flush()
    return [p for p in paras if p]


# ---------------------------------------------------------------------------
# Encabezados estructurales
# ---------------------------------------------------------------------------

_TITULO_RE = re.compile(r"^\s*T[ÍI]TULO\s+[A-ZÁÉÍÓÚÑ ]+\s*$")
_CAPITULO_RE = re.compile(r"^\s*CAP[ÍI]TULO\s+(?:[IVXLCDM]+|[ÚU]NICO)(?:\s+(?:BIS|TER|QU[ÁA]TER))?\s*$", re.IGNORECASE)
_SECCION_RE = re.compile(r"^\s*SECCI[ÓO]N\s+[A-ZÁÉÍÓÚÑ0-9 ]+\s*$", re.IGNORECASE)
_TRANSITORIOS_START_RE = re.compile(r"^\s*(?:ART[ÍI]CULOS\s+)?TRANSITORIOS?\s*$")
_DECRETO_RE = re.compile(r"^\s*DECRETO\s+(?:por el que|que)\b", re.IGNORECASE)

_ORDINAL_WORD = (
    r"(?:Primero|Segundo|Tercero|Cuarto|Quinto|Sexto|S[ée]ptimo|Octavo|Noveno|D[ée]cimo|Und[ée]cimo|Duod[ée]cimo|"
    r"Vig[ée]simo|Trig[ée]simo|Cuadrag[ée]simo|[ÚU]nico)"
)
_TRANS_HEAD_RE = re.compile(
    r"^\s*(?:ART[ÍI]CULO\s+|Art[íi]culo\s+)?"
    rf"(?P<ord>{_ORDINAL_WORD}(?:\s+{_ORDINAL_WORD})?|\d{{1,3}}\s*(?:o|º|°)?)"
    r"\s*(?:\.\s*-|\.|-)\s*(?P<rest>.*)$",
    re.IGNORECASE,
)


def _is_heading(line: str) -> bool:
    return bool(_TITULO_RE.match(line) or _CAPITULO_RE.match(line) or _SECCION_RE.match(line))


def _title_case_ordinal(s: str) -> str:
    s = re.sub(r"\s+", " ", s.strip())
    if re.match(r"^\d", s):
        return re.sub(r"\s*(?:o|º|°)$", "", s)
    return " ".join(w[:1].upper() + w[1:].lower() for w in s.split(" "))


# ---------------------------------------------------------------------------
# Parser principal
# ---------------------------------------------------------------------------


def _approx_tokens(text: str) -> int:
    # Aproximación conservadora para español con tokenizadores BPE/WordPiece (≈1.35 tokens por palabra).
    return int(len(text.split()) * 1.35) + 1


def _split_into_articles(pages: Sequence[str], law_code: LawCode = "LFT") -> list[_Article]:
    articles: list[_Article] = []
    titulo = capitulo = seccion = ""
    cur: _Article | None = None
    in_transitorios = False
    decreto_num = 0
    decreto_title = (
        "Ley Federal del Trabajo (1970), transitorios originales"
        if law_code == "LFT"
        else "Ley del Seguro Social (1995), transitorios originales"
    )
    decree_part = "transitorio"  # "decreto" antes del encabezado TRANSITORIO(S) dentro de un decreto
    pending_heading: str | None = None  # "titulo" | "capitulo" | "seccion" esperando subtítulo
    collecting_decree_title: list[str] | None = None
    seen_ids: dict[str, int] = {}

    def start(article_id: str, label: str, page: int, first: str) -> None:
        nonlocal cur
        n = seen_ids.get(article_id, 0)
        seen_ids[article_id] = n + 1
        uid = article_id if n == 0 else f"{article_id} [{n + 1}]"
        cur = _Article(
            articulo_id=uid,
            label=label,
            titulo=titulo,
            capitulo=capitulo,
            seccion=seccion,
            page=page,
            is_transitorio=in_transitorios,
            decreto=decreto_title if in_transitorios else "",
            decreto_num=decreto_num if in_transitorios else 0,
        )
        articles.append(cur)
        if first.strip():
            cur.lines.append(first)

    for page_no, page_text in enumerate(pages, start=1):
        lines = clean_page(page_text)
        prev_blank = True  # el inicio de página cuenta como separación
        for line in lines:
            stripped = line.strip()
            if not stripped:
                prev_blank = True
                if collecting_decree_title is not None and collecting_decree_title:
                    decreto_title = re.sub(r"\s+", " ", " ".join(collecting_decree_title)).strip()
                    collecting_decree_title = None
                if cur is not None:
                    cur.lines.append("")
                continue

            if collecting_decree_title is not None:
                collecting_decree_title.append(stripped)
                prev_blank = False
                continue

            if pending_heading and not _is_heading(stripped) and not _HEAD_RE.match(stripped):
                if pending_heading == "titulo":
                    titulo = f"{titulo} - {stripped}"
                elif pending_heading == "capitulo":
                    capitulo = f"{capitulo} - {stripped}"
                else:
                    seccion = f"{seccion} - {stripped}"
                pending_heading = None
                prev_blank = False
                continue
            pending_heading = None

            if not in_transitorios:
                if _TRANSITORIOS_START_RE.match(stripped) and prev_blank:
                    in_transitorios = True
                    cur = None
                    titulo, capitulo, seccion = "TRANSITORIOS", "", ""
                    decree_part = "transitorio"
                    prev_blank = False
                    continue
                if _TITULO_RE.match(stripped):
                    titulo, capitulo, seccion = re.sub(r"\s+", " ", stripped), "", ""
                    pending_heading = "titulo"
                    cur = None
                    prev_blank = False
                    continue
                if _CAPITULO_RE.match(stripped):
                    capitulo, seccion = re.sub(r"\s+", " ", stripped), ""
                    pending_heading = "capitulo"
                    cur = None
                    prev_blank = False
                    continue
                if _SECCION_RE.match(stripped):
                    seccion = re.sub(r"\s+", " ", stripped)
                    pending_heading = "seccion"
                    cur = None
                    prev_blank = False
                    continue
                m = _HEAD_RE.match(stripped) if prev_blank else None
                if m:
                    canon, label = _id_from_match(m)
                    start(canon, label, page_no, m.group("rest"))
                    prev_blank = False
                    continue
            else:
                if _DECRETO_RE.match(stripped) and prev_blank:
                    decreto_num += 1
                    collecting_decree_title = [stripped]
                    decree_part = "decreto"
                    cur = None
                    prev_blank = False
                    continue
                if re.match(r"^\s*ART[ÍI]CULOS TRANSITORIOS DE DECRETOS DE REFORMA\s*$", stripped):
                    cur = None
                    prev_blank = False
                    continue
                if _TRANSITORIOS_START_RE.match(stripped):
                    decree_part = "transitorio"
                    cur = None
                    prev_blank = False
                    continue
                m = _TRANS_HEAD_RE.match(stripped) if prev_blank else None
                if m:
                    ordinal = _title_case_ordinal(m.group("ord"))
                    origin = "Ley original" if decreto_num == 0 else f"Decreto {decreto_num}"
                    if decree_part == "transitorio":
                        canon = f"Transitorio {ordinal} ({origin})"
                    else:
                        canon = f"{origin}, Artículo {ordinal}"
                    start(canon, canon, page_no, m.group("rest"))
                    prev_blank = False
                    continue

            if cur is not None:
                cur.lines.append(stripped)
            prev_blank = False
    return articles


def _split_long(
    paragraphs: list[str], header: str, label: str, max_tokens: int, count: TokenCounter
) -> list[str]:
    """Agrupa párrafos en partes <= max_tokens, cortando preferentemente en fracciones y nunca a media oración."""
    head_budget = count(f"{header}\nArtículo {label} (Parte 99/99).- ")
    budget = max(64, max_tokens - head_budget)

    # Unidades: un bloque por fracción (párrafo que inicia con número romano y lo que le sigue hasta la próxima).
    units: list[str] = []
    for p in paragraphs:
        if _FRACCION_START.match(p) or not units:
            units.append(p)
        else:
            units[-1] = units[-1] + "\n\n" + p

    # Una unidad que aún excede el presupuesto se parte en párrafos y luego en oraciones completas.
    pieces: list[str] = []
    for u in units:
        if count(u) <= budget:
            pieces.append(u)
            continue
        for p in u.split("\n\n"):
            if count(p) <= budget:
                pieces.append(p)
                continue
            sentences = re.split(r"(?<=[.;:])\s+(?=[A-ZÁÉÍÓÚÑ0-9(])", p)
            buf = ""
            for s in sentences:
                cand = f"{buf} {s}".strip()
                if buf and count(cand) > budget:
                    pieces.append(buf)
                    buf = s
                else:
                    buf = cand
            if buf:
                pieces.append(buf)

    groups: list[str] = []
    buf = ""
    for piece in pieces:
        cand = f"{buf}\n\n{piece}" if buf else piece
        if buf and count(cand) > budget:
            groups.append(buf)
            buf = piece
        else:
            buf = cand
    if buf:
        groups.append(buf)
    return groups


def _header(titulo: str, capitulo: str, seccion: str) -> str:
    parts = [p for p in (titulo, capitulo, seccion) if p]
    return "[" + " | ".join(parts) + "]"


def build_chunks(
    pages: Sequence[str],
    max_tokens: int = 480,
    count_tokens: TokenCounter | None = None,
    law_code: LawCode = "LFT",
) -> list[ArticleChunk]:
    count = count_tokens or _approx_tokens
    chunks: list[ArticleChunk] = []
    for art in _split_into_articles(pages, law_code=law_code):
        paras = _paragraphs(art.lines)
        notes = [p for p in paras if is_note_line(p)]
        substantive = [p for p in paras if not is_note_line(p)]
        body = "\n\n".join(paras).strip()
        if not body:
            continue
        derogado = article_is_derogado("\n".join(substantive), notes)
        reform_date = latest_dof_date("\n".join(notes))
        header = _header(art.titulo, art.capitulo, art.seccion)
        display = art.label if art.is_transitorio else f"Artículo {art.label}"
        full = f"{header}\n{display}.- {body}"
        if count(full) <= max_tokens:
            groups = [body]
        else:
            groups = _split_long(paras, header, art.label, max_tokens, count)
        total = len(groups)
        for i, g in enumerate(groups, start=1):
            prefix = f"{display}.-" if total == 1 else f"{display} (Parte {i}/{total}).-"
            chunks.append(
                ArticleChunk(
                    chunk_id=f"{law_code.lower()}_art_{art.articulo_id}_part_{i - 1}",
                    articulo_id=art.articulo_id,
                    articulo_label=art.label,
                    text=f"{header}\n{prefix} {g}",
                    body=g,
                    law_code=law_code,
                    titulo=art.titulo,
                    capitulo=art.capitulo,
                    seccion=art.seccion,
                    is_derogado=derogado,
                    is_transitorio=art.is_transitorio,
                    reform_date=reform_date,
                    decreto=art.decreto,
                    decreto_num=art.decreto_num,
                    part_index=i,
                    part_total=total,
                    page_start=art.page,
                )
            )
    return chunks


def parse_pdf(
    pdf_path: str | Path,
    max_tokens: int = 480,
    count_tokens: TokenCounter | None = None,
    law_code: LawCode = "LFT",
) -> tuple[list[ArticleChunk], str]:
    """Lee el PDF y devuelve (chunks, fecha de última reforma)."""
    pages = extract_pages(pdf_path)
    return build_chunks(pages, max_tokens=max_tokens, count_tokens=count_tokens, law_code=law_code), extract_reform_version(pages)


def iter_article_ids(chunks: Iterable[ArticleChunk]) -> list[str]:
    seen: dict[str, None] = {}
    for c in chunks:
        seen.setdefault(c.articulo_id, None)
    return list(seen)
