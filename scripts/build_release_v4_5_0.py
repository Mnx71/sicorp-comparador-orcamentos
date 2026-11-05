#!/usr/bin/env python3
"""Gera os pacotes de distribuicao SICORP v4.5.0 a partir da arvore do GitHub."""
from __future__ import annotations
import hashlib
import html
import re
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
DOCS = ROOT / "docs"
REPORT = DOCS / "RELATORIO_ENTREGA_E_VALIDACAO_v4.5.0.md"
APP = DIST / "sicorp_comparador_orcamento_v4.5.0.html"
MANUAL = DOCS / "manual/SICORP_Manual_Usuario_v4.5.0.pdf"
OUT = ROOT / "release/v4.5.0"
APP_SHA = "33807e74bdb45c0bb081bb2001a40cb1c16394144dfad7c9930e2cde4aaa6905"

def make_report_pdf(target: Path):
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import mm
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    from reportlab.platypus import HRFlowable, Paragraph, SimpleDocTemplate
    fonts = Path("/usr/share/fonts/truetype/dejavu")
    if (fonts / "DejaVuSans.ttf").exists():
        pdfmetrics.registerFont(TTFont("DejaVuSans", str(fonts/"DejaVuSans.ttf")))
        pdfmetrics.registerFont(TTFont("DejaVuSans-Bold", str(fonts/"DejaVuSans-Bold.ttf")))
        pdfmetrics.registerFontFamily("DejaVuSans", normal="DejaVuSans", bold="DejaVuSans-Bold")
        font = "DejaVuSans"
    else:
        font = "Helvetica"
    navy = colors.HexColor("#163551")
    gray = colors.HexColor("#566473")
    default = getSampleStyleSheet()
    title = ParagraphStyle("SicTitle", parent=default["Title"], fontName=font, fontSize=17, leading=23, textColor=navy, spaceAfter=10)
    intro = ParagraphStyle("SicIntro", parent=default["Normal"], fontName=font, fontSize=8.75, leading=12.5, textColor=gray, spaceAfter=9)
    head = ParagraphStyle("SicHead", parent=default["Heading2"], fontName=font, fontSize=11.25, leading=14, textColor=navy, spaceBefore=10, spaceAfter=4)
    body = ParagraphStyle("SicBody", parent=default["Normal"], fontName=font, fontSize=8.75, leading=12.5, spaceAfter=5, splitLongWords=True, wordWrap="CJK")
    bullet = ParagraphStyle("SicBullet", parent=body, leftIndent=15, firstLineIndent=-9, spaceAfter=3)
    def inline(txt):
        txt = html.escape(txt)
        txt = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", txt)
        txt = re.sub(re.escape(chr(96)) + r"(.+?)" + re.escape(chr(96)), r'<font color="#174C72">\1</font>', txt)
        txt = re.sub(r"(?<!\x22)\b(https://[^\s<]+)", lambda m: '<link href="' + m.group(1) + '" color="#1768A4">' + m.group(1) + '</link>', txt)
        return txt
    story = []
    for line in REPORT.read_text(encoding="utf-8").splitlines():
        s = line.strip()
        if not s:
            continue
        if s.startswith("# "):
            story += [Paragraph(inline(s[2:]), title), HRFlowable(width="100%", thickness=1, color=navy, spaceAfter=8)]
        elif s.startswith("## "):
            story.append(Paragraph(inline(s[3:]), head))
        elif s.startswith("- "):
            story.append(Paragraph("&#8226; " + inline(s[2:]), bullet))
        else:
            story.append(Paragraph(inline(s), intro if s.startswith("**Data:**") else body))
    def footer(canvas, document):
        canvas.saveState()
        w, _ = A4
        canvas.setStrokeColor(colors.HexColor("#CBD2D8"))
        canvas.line(19*mm, 16*mm, w-19*mm, 16*mm)
        canvas.setFont(font, 7.5)
        canvas.setFillColor(gray)
        canvas.drawString(19*mm, 11.5*mm, "SICORP v4.5.0 - Relatorio de Entrega e Validacao - 05/11/2026")
        canvas.drawRightString(w-19*mm, 11.5*mm, f"Pagina {document.page}")
        canvas.restoreState()
    doc = SimpleDocTemplate(str(target), pagesize=A4, rightMargin=19*mm, leftMargin=19*mm, topMargin=20*mm, bottomMargin=19*mm, title="SICORP v4.5.0 - Relatorio de Entrega e Validacao")
    doc.build(story, onFirstPage=footer, onLaterPages=footer)

def zip_files(path: Path, files: list[tuple[Path, str]], texts: list[tuple[str, str]]):
    items = [(name, file.read_bytes()) for file, name in files]
    items += [(name, text.encode("utf-8")) for name, text in texts]
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for name, data in sorted(items):
            entry = zipfile.ZipInfo(name, date_time=(2026,11,5,0,0,0))
            entry.external_attr = 0o644 << 16
            entry.compress_type = zipfile.ZIP_DEFLATED
            z.writestr(entry, data, compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)
    with zipfile.ZipFile(path, "r") as z:
        assert z.testzip() is None, "ZIP invalido: " + str(path)

def main():
    for path in (APP, MANUAL, REPORT, DIST/"SHA256_v4.5.0.txt", ROOT/"recovery/v4.5.0/README.md", DOCS/"releases/v4.5.0-recuperacao.md"):
        if not path.is_file():
            raise SystemExit("Arquivo obrigatorio ausente: " + str(path))
    digest = hashlib.sha256(APP.read_bytes()).hexdigest()
    if digest != APP_SHA:
        raise SystemExit("HTML difere da versao final aprovada: " + digest)
    if not MANUAL.read_bytes().startswith(b"%PDF-"):
        raise SystemExit("Manual PDF invalido")
    OUT.mkdir(parents=True, exist_ok=True)
    report_pdf = OUT / "SICORP_Relatorio_Entrega_Validacao_v4.5.0.pdf"
    make_report_pdf(report_pdf)
    p = "SICORP_v4.5.0_USUARIO/"
    user_readme = (
        "SICORP v4.5.0 - Pacote de uso (05/11/2026)\n\n"
        "1. Extraia este arquivo ZIP.\n"
        "2. Abra SICORP_v4.5.0.html no navegador.\n"
        "3. Consulte Manual_do_Usuario_v4.5.0.pdf.\n\n"
        "O programa funciona localmente, sem instalacao.\n"
        "O tutorial integrado pode ser acessado dentro do programa.\n"
    )
    zip_files(OUT/"SICORP_v4.5.0_USUARIO.zip", [
        (APP,p+"SICORP_v4.5.0.html"),
        (MANUAL,p+"Manual_do_Usuario_v4.5.0.pdf"),
        (DIST/"SHA256_v4.5.0.txt",p+"SHA256_v4.5.0.txt"),
    ],[(p+"LEIA-ME.txt",user_readme)])
    p = "SICORP_v4.5.0_TECNICO_RECUPERADO/"
    tech_readme = (
        "SICORP 4.5.0 - PACOTE TECNICO RECUPERADO\n\n"
        "Este pacote contem o HTML final aprovado, fontes JS/CSS extraidos,\n"
        "scripts de reconstrucao, testes de integridade e documentacao.\n"
        "NAO E o pacote tecnico original: a arvore modular e os commits\n"
        "locais originais nao foram recuperados.\n"
        "Os 400 testes e 27 verificacoes agrupadas pertencem ao historico\n"
        "anterior e nao foram integralmente reproduzidos nesta recuperacao.\n\n"
        "No diretorio extraido: npm --prefix recovery/v4.5.0 run check\n"
    )
    technical = [
        (APP,p+"dist/"+APP.name),
        (MANUAL,p+"docs/manual/"+MANUAL.name),
        (report_pdf,p+"docs/"+report_pdf.name),
        (REPORT,p+"docs/"+REPORT.name),
        (DIST/"SHA256_v4.5.0.txt",p+"dist/SHA256_v4.5.0.txt"),
        (DOCS/"releases/v4.5.0-recuperacao.md",p+"docs/releases/v4.5.0-recuperacao.md"),
    ]
    for folder in (ROOT/"recovery/v4.5.0",ROOT/"testkit/agrupados"):
        for file in sorted(folder.rglob("*")):
            if file.is_file() and "node_modules" not in file.parts:
                technical.append((file,p+str(file.relative_to(ROOT))))
    zip_files(OUT/"SICORP_v4.5.0_TECNICO_RECUPERADO.zip", technical, [(p+"LEIA-ME.txt",tech_readme)])
    for file in sorted(OUT.iterdir()):
        print(file.name, "bytes=", file.stat().st_size, "sha256=", hashlib.sha256(file.read_bytes()).hexdigest())

if __name__ == "__main__":
    main()
