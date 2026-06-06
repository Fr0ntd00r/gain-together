#!/usr/bin/env python3
"""Baut Fitness-Guide-Komplett.md deterministisch aus den Kapiteldateien.

Hintergrund: Fitness-Guide-Komplett.md ist eine GENERIERTE Datei (Frontmatter +
Intro-Block + Kapitel 00–07 mit \\newpage-Trennern). build-pdf.py liest sie nur
als Eingabe. Nach jeder Änderung an den Kapiteldateien zuerst dieses Skript,
danach build-pdf.py ausführen.

Aufruf:
    python3 docs/fitness-guide/build-combined.py
"""
import os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "Fitness-Guide-Komplett.md")

CHAPTERS = [
    "00-profil-und-ziele.md",
    "01-ernaehrung-grundlagen.md",
    "02-mahlzeiten-bibliothek.md",
    "03-wochenplaene-und-alltag.md",
    "04-einkauf-und-mealprep.md",
    "05-training.md",
    "06-supplements.md",
    "07-tracking-roadmap-plateaus.md",
]

HEADER = """---
title: "Persönliches Fitness- & Ernährungs-Handbuch"
subtitle: "Fettverlust + Muskelaufbau · 110 kg → 85–90 kg"
date: "2026"
lang: de
---

# Persönliches Fitness- & Ernährungs-Handbuch

> Evidenzbasierter Coaching-Leitfaden für Körperrekomposition (Fettverlust + Muskelaufbau).
> Aufbereitet aus dem ChatGPT-Coaching-Chat „Fitnessberatung und Trainingsplanung".

**Profil:** 29 J · m · 178 cm · 110 kg · ~32 % KFA · 3 Monate Trainingserfahrung · Bürojob · Studio: Alltime Fitness Eisenberg · Ziel: 85–90 kg in 12 Monaten.

**Tägliche Kernziele:** 2.500–2.700 kcal (Training) / 2.200–2.400 kcal (Ruhetag) · 190–210 g Protein · 35–45 g Ballaststoffe · 3–4 L Wasser · 8.000–10.000 Schritte · 7–8 h Schlaf · 3× Krafttraining/Woche.

**Vermieden:** Fisch · Schweinefleisch · Pilze · Rote Beete · Äpfel · Hüttenkäse · Linsen.

\\newpage

"""


def main() -> None:
    parts = [HEADER]
    for fname in CHAPTERS:
        with open(os.path.join(HERE, fname), encoding="utf-8") as fh:
            parts.append(fh.read())
        parts.append("\n\n\\newpage\n\n")
    with open(OUT, "w", encoding="utf-8") as out:
        out.write("".join(parts))
    print(f"Combined-MD erstellt: {OUT} ({os.path.getsize(OUT)} Bytes)")


if __name__ == "__main__":
    main()
