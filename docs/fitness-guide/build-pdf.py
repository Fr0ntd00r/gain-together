#!/usr/bin/env python3
"""Erzeugt Fitness-Guide.pdf aus Fitness-Guide-Komplett.md.

Voraussetzungen:
    pip install markdown weasyprint

Aufruf (aus dem Repo-Root oder einem beliebigen Verzeichnis):
    python3 docs/fitness-guide/build-pdf.py
"""
import os
import markdown
from weasyprint import HTML

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "Fitness-Guide-Komplett.md")
OUT = os.path.join(HERE, "Fitness-Guide.pdf")

CSS = """
@page { size: A4; margin: 1.8cm 1.6cm;
  @bottom-center { content: counter(page) " / " counter(pages); font-size: 9px; color:#888; }
}
* { box-sizing: border-box; }
body { font-family: 'DejaVu Sans', 'Helvetica', sans-serif; font-size: 10.5px; line-height: 1.5; color:#1a1a1a; }
h1 { font-size: 20px; color:#0f5132; border-bottom:3px solid #0f5132; padding-bottom:4px; margin-top:0.2em; page-break-after:avoid; }
h2 { font-size: 15px; color:#146c43; margin-top:1.1em; page-break-after:avoid; }
h3 { font-size: 12.5px; color:#198754; margin-top:0.9em; page-break-after:avoid; }
h4 { font-size: 11px; color:#333; margin-top:0.7em; page-break-after:avoid; }
table { border-collapse: collapse; width:100%; margin:0.6em 0; font-size:9.3px; page-break-inside:avoid; }
th, td { border:1px solid #cfd8d3; padding:4px 6px; text-align:left; vertical-align:top; }
th { background:#e7f1ec; color:#0f5132; font-weight:600; }
tr:nth-child(even) td { background:#f6faf8; }
code { background:#eef2f0; padding:1px 4px; border-radius:3px; font-size:9px; }
pre { background:#0f172a; color:#e2e8f0; padding:10px; border-radius:6px; overflow:auto; font-size:8.6px; }
pre code { background:none; color:inherit; }
blockquote { border-left:4px solid #198754; margin:0.6em 0; padding:2px 12px; background:#f0f7f3; color:#2a4a3a; }
ul,ol { margin:0.3em 0 0.6em 1.1em; padding:0; }
li { margin:1px 0; }
hr { border:none; border-top:1px solid #dde5e1; margin:0.9em 0; }
.pagebreak { page-break-after: always; }
strong { color:#0f3d2a; }
a { color:#146c43; text-decoration:none; }
"""


def main() -> None:
    src = open(SRC, encoding="utf-8").read()

    # YAML-Frontmatter entfernen
    if src.startswith("---"):
        end = src.find("\n---", 3)
        if end != -1:
            src = src[end + 4:]

    # \newpage -> Seitenumbruch
    src = src.replace("\\newpage", '\n\n<div class="pagebreak"></div>\n\n')

    body = markdown.markdown(
        src, extensions=["tables", "fenced_code", "toc", "sane_lists"]
    )
    html = (
        f"<!DOCTYPE html><html lang='de'><head><meta charset='utf-8'>"
        f"<style>{CSS}</style></head><body>{body}</body></html>"
    )
    HTML(string=html, base_url=HERE).write_pdf(OUT)
    print(f"PDF erstellt: {OUT} ({os.path.getsize(OUT)} Bytes)")


if __name__ == "__main__":
    main()
