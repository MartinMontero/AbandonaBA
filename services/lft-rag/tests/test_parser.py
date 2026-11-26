from __future__ import annotations

import pytest

from src.parser import (
    ArticleChunk,
    article_is_derogado,
    build_chunks,
    clean_page,
    latest_dof_date,
    normalize_articulo_id,
)

HEADER = """LEY FEDERAL DEL TRABAJO

CÁMARA DE DIPUTADOS DEL H. CONGRESO DE LA UNIÓN
Secretaría General
Secretaría de Servicios Parlamentarios
Última Reforma DOF 14-05-2026


{n} de 3
"""

PAGE1 = HEADER.format(n=1) + """LEY FEDERAL DEL TRABAJO

TEXTO VIGENTE
Última reforma publicada 14-05-2026

TITULO PRIMERO
Principios Generales

Artículo 1o.- La presente Ley es de observancia general en toda la República y rige las relaciones de
trabajo comprendidas en el artículo 123, Apartado A, de la Constitución.

Artículo 3o. Bis.- Para efectos de esta Ley se entiende por:

a)
Hostigamiento, el ejercicio del poder; y
Artículo adicionado DOF 30-11-2012

Artículo 15-A. Se deroga.
Artículo adicionado DOF 30-11-2012. Derogado DOF 23-04-2021

TITULO SEGUNDO
Relaciones Individuales de Trabajo

CAPITULO IV
Rescisión de las relaciones de trabajo

Artículo 47.- Son causas de rescisión de la relación de trabajo, sin responsabilidad para el patrón:

I.
Engañarlo el trabajador con certificados falsos.

"""

PAGE2 = HEADER.format(n=2) + """II.
Incurrir el trabajador en faltas de probidad u honradez.

IV.
(Se deroga).
Fracción derogada DOF 30-11-2012

V.
Ocasionar el trabajador perjuicios materiales.
Artículo reformado DOF 30-11-2012, 01-05-2019

Artículo 169.- (Se deroga).
Artículo derogado DOF 31-12-1974

SECCIÓN PRIMERA
Disposiciones especiales

Artículo 512-D Bis.- Para el caso de la restricción de acceso a las áreas de riesgo.
Artículo adicionado DOF 30-11-2012

Artículo 279 Quáter.- La persona empleadora deberá llevar un padrón especial.

Artículo 353-Ñ.- Los sindicatos de las universidades.

"""

PAGE3 = HEADER.format(n=3) + """TRANSITORIOS

Artículo 1º.- Esta Ley entrará en vigor el día 1o. de mayo de 1970.

ARTÍCULOS TRANSITORIOS DE DECRETOS DE REFORMA

DECRETO por el que se reforman diversas disposiciones de la Ley
Federal del Trabajo.

Publicado en el Diario Oficial de la Federación el 1 de mayo de 2019

ARTÍCULO ÚNICO.- Se reforman los artículos 47 y 48 para quedar como sigue:

TRANSITORIOS

Primero. El presente Decreto entrará en vigor al día siguiente.

Segundo. Se derogan las disposiciones que se opongan.

DECRETO por el que se reforma el artículo 74 de la Ley Federal del Trabajo.

TRANSITORIO

Primero.- El presente Decreto entrará en vigor al día siguiente.
"""


@pytest.fixture(scope="module")
def chunks() -> list[ArticleChunk]:
    return build_chunks([PAGE1, PAGE2, PAGE3], max_tokens=10_000)


def by_id(chunks: list[ArticleChunk], aid: str) -> list[ArticleChunk]:
    return [c for c in chunks if c.articulo_id == aid]


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("1o.", "1"),
        ("Artículo 3o. Bis", "3 Bis"),
        ("3 bis", "3 Bis"),
        ("15-a", "15-A"),
        ("330-A", "330-A"),
        ("512-D bis", "512-D Bis"),
        ("279 Cuáter", "279 Quáter"),
        ("279 Quater", "279 Quáter"),
        ("100 Quinquies", "100 Quinquies"),
        ("1º", "1"),
        ("353-ñ", "353-Ñ"),
        ("Único", "Único"),
        ("Art. 47", "47"),
    ],
)
def test_normalize_articulo_id(raw: str, expected: str) -> None:
    assert normalize_articulo_id(raw) == expected


def test_boilerplate_is_stripped() -> None:
    lines = [l.strip() for l in clean_page(PAGE1) if l.strip()]
    assert "Secretaría General" not in lines
    assert "1 de 3" not in lines
    assert "TEXTO VIGENTE" not in lines
    assert not any(l.startswith("Última Reforma DOF") for l in lines)
    for c in build_chunks([PAGE1, PAGE2, PAGE3]):
        assert "CÁMARA DE DIPUTADOS" not in c.text
        assert "Secretaría de Servicios Parlamentarios" not in c.text


def test_canonical_ids_and_suffixes(chunks: list[ArticleChunk]) -> None:
    ids = {c.articulo_id for c in chunks if not c.is_transitorio}
    assert {"1", "3 Bis", "15-A", "47", "169", "512-D Bis", "279 Quáter", "353-Ñ"} <= ids


def test_hierarchy_and_subtitles(chunks: list[ArticleChunk]) -> None:
    a1 = by_id(chunks, "1")[0]
    assert a1.titulo == "TITULO PRIMERO - Principios Generales"
    assert a1.capitulo == ""
    a47 = by_id(chunks, "47")[0]
    assert a47.titulo == "TITULO SEGUNDO - Relaciones Individuales de Trabajo"
    assert a47.capitulo == "CAPITULO IV - Rescisión de las relaciones de trabajo"
    assert a47.text.startswith("[TITULO SEGUNDO - Relaciones Individuales de Trabajo | CAPITULO IV - Rescisión")
    a512 = by_id(chunks, "512-D Bis")[0]
    assert a512.seccion == "SECCIÓN PRIMERA - Disposiciones especiales"


def test_article_continues_across_pages(chunks: list[ArticleChunk]) -> None:
    body = " ".join(c.body for c in by_id(chunks, "47"))
    assert "I. Engañarlo el trabajador" in body
    assert "V. Ocasionar el trabajador perjuicios" in body


def test_whole_article_vs_fraccion_derogation(chunks: list[ArticleChunk]) -> None:
    assert by_id(chunks, "15-A")[0].is_derogado is True
    assert by_id(chunks, "169")[0].is_derogado is True
    # Art. 47 tiene la fracción IV derogada pero el artículo sigue vigente.
    assert all(not c.is_derogado for c in by_id(chunks, "47"))
    assert "IV. (Se deroga)." in by_id(chunks, "47")[0].body
    assert by_id(chunks, "3 Bis")[0].is_derogado is False


def test_latest_reform_date(chunks: list[ArticleChunk]) -> None:
    assert latest_dof_date("Artículo reformado DOF 30-11-2012, 01-05-2019") == "01-05-2019"
    assert latest_dof_date("Párrafo reformado DOF 01-05-2019, 15-01-2026") == "15-01-2026"
    assert by_id(chunks, "47")[0].reform_date == "01-05-2019"
    assert by_id(chunks, "15-A")[0].reform_date == "23-04-2021"
    assert by_id(chunks, "1")[0].reform_date == ""


def test_derogation_rule_helper() -> None:
    assert article_is_derogado("Se deroga.", [])
    assert article_is_derogado("(Se deroga).", [])
    assert article_is_derogado("", ["Artículo derogado DOF 31-12-1974"])
    assert not article_is_derogado("", ["Artículo derogado DOF 31-12-1974. Adicionado DOF 30-11-2012"])
    assert not article_is_derogado("Son causas de rescisión...\nIV. (Se deroga).", [])


def test_transitorios_are_isolated_and_disambiguated(chunks: list[ArticleChunk]) -> None:
    trans = [c for c in chunks if c.is_transitorio]
    ids = [c.articulo_id for c in trans]
    assert "Transitorio 1 (Ley original)" in ids
    assert "Decreto 1, Artículo Único" in ids
    assert "Transitorio Primero (Decreto 1)" in ids
    assert "Transitorio Segundo (Decreto 1)" in ids
    assert "Transitorio Primero (Decreto 2)" in ids
    d1 = next(c for c in trans if c.articulo_id == "Transitorio Primero (Decreto 1)")
    assert d1.decreto.startswith("DECRETO por el que se reforman diversas disposiciones de la Ley Federal del Trabajo")
    assert d1.decreto_num == 1
    # El transitorio "1º" de la ley original no pisa al Artículo 1 sustantivo.
    assert by_id(chunks, "1")[0].is_transitorio is False


def test_metadata_is_chroma_safe(chunks: list[ArticleChunk]) -> None:
    for c in chunks:
        for k, v in c.metadata().items():
            assert isinstance(v, (str, int, bool)), (k, v)


def test_fraccion_subchunking_repeats_header_and_never_splits_sentences() -> None:
    long_body = "\n \n".join(
        f"{r}.  \nEsta es la fracción {r} con un texto suficientemente largo para forzar la división en partes. "
        "Contiene dos oraciones completas."
        for r in ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"]
    )
    page = "TITULO SEGUNDO \nRelaciones \n \nArtículo 132.- Son obligaciones de los patrones: \n \n" + long_body + " \n"
    out = build_chunks([page], max_tokens=80)
    parts = [c for c in out if c.articulo_id == "132"]
    assert len(parts) > 1
    total = len(parts)
    for i, c in enumerate(parts, start=1):
        assert c.text.startswith(f"[TITULO SEGUNDO - Relaciones]\nArtículo 132 (Parte {i}/{total}).-")
        assert c.part_total == total
        assert c.body.rstrip().endswith((".", ":"))
    joined = " ".join(c.body for c in parts)
    for r in ["I", "II", "III", "VIII"]:
        assert f"{r}. Esta es la fracción {r}" in joined


def test_short_article_is_not_split(chunks: list[ArticleChunk]) -> None:
    assert len(by_id(chunks, "1")) == 1
    assert by_id(chunks, "1")[0].text.splitlines()[1].startswith("Artículo 1.- La presente Ley")
