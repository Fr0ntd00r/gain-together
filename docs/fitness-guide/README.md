# Persönliches Fitness- & Ernährungs-Handbuch

> Evidenzbasierter Coaching-Leitfaden für Fettverlust + Muskelaufbau (Körperrekomposition)
> Aufbereitet aus dem ChatGPT-Coaching-Chat „Fitnessberatung und Trainingsplanung".

Dieses Handbuch fasst das gesamte im Coaching-Chat erarbeitete Wissen strukturiert und entdoppelt zusammen. Es ist so aufgebaut, dass du daraus eine PDF erstellen **und** die Inhalte schrittweise in die App (Workouts, Übungen, Ernährung, Fortschritt) übernehmen kannst.

## Steckbrief (Stand der Erstellung)

| Kennzahl | Wert |
|---|---|
| Alter | 29 Jahre |
| Geschlecht | männlich |
| Größe | 178 cm |
| Gewicht | 110 kg |
| Körperfett | ca. 32 % |
| Fettfreie Masse | ca. 75 kg |
| Trainingserfahrung | ca. 3 Monate |
| Aktivität | Bürojob, überwiegend sitzend |
| Studio | Alltime Fitness Eisenberg |
| Trainingstage | meist Mo / Mi / Fr (flexibel), Training meist allein |
| Ziel | Fettverlust + Muskelaufbau/-erhalt (Recomposition) |
| Zielgewicht | 85–90 kg in ca. 12 Monaten |
| Restaurant/Alkohol | meist 0–2 Abende pro Monat |

## Tägliche Kernziele

| Ziel | Menge |
|---|---|
| Kalorien Trainingstag | 2.500–2.700 kcal |
| Kalorien Ruhetag | 2.200–2.400 kcal |
| Protein | 190–210 g (Minimum 180 g) |
| Ballaststoffe | 35–45 g |
| Wasser | 3–4 Liter |
| Schritte | 8.000–10.000 |
| Schlaf | 7–8 Stunden |
| Training | 3× Krafttraining / Woche |

## Vermiedene Lebensmittel

Nicht aus gesundheitlichen Gründen, sondern aus persönlicher Vorliebe ausgeschlossen:

- ❌ Fisch
- ❌ Schweinefleisch
- ❌ Pilze
- ❌ Rote Beete
- ❌ Äpfel
- ❌ Hüttenkäse
- ❌ Linsen

Vorhandene Supplements: **Whey (mit Geschmack)**, **Sahne-Protein**, **Iso Clear Protein**.

## Inhaltsverzeichnis

| Kapitel | Datei | Inhalt |
|---|---|---|
| 0 | [00-profil-und-ziele.md](./00-profil-und-ziele.md) | Ausgangslage, Zieldefinition, Erfolgskennzahlen, 80/20-Prinzip |
| 1 | [01-ernaehrung-grundlagen.md](./01-ernaehrung-grundlagen.md) | Kalorien-, Protein-, Ballaststoffstrategie, größte Fehler, „Protein-Fasten"-Bewertung |
| 2 | [02-mahlzeiten-bibliothek.md](./02-mahlzeiten-bibliothek.md) | Frühstück, Mittag, Abendessen, Snacks – jeweils mit Makros & Bewertungen |
| 3 | [03-wochenplaene-und-alltag.md](./03-wochenplaene-und-alltag.md) | Komplette Tagespläne, Wochenpläne, Restaurant-/Alkohol-/Hotel-/Urlaub-/Notfallsysteme |
| 4 | [04-einkauf-und-mealprep.md](./04-einkauf-und-mealprep.md) | Einkaufslisten, Vorratssystem, Meal-Prep (30/60 Min), Büro- & Reise-Kit |
| 5 | [05-training.md](./05-training.md) | Trainingsprinzipien, Plan A/B, Ganzkörper-Alternative, Progression, Cardio, Deload, Kraftziele |
| 6 | [06-supplements.md](./06-supplements.md) | Supplement-Ranking & persönliches Protokoll |
| 7 | [07-tracking-roadmap-plateaus.md](./07-tracking-roadmap-plateaus.md) | Tracking-System, 12-Monats-Roadmap, Plateau-Management, Monatsreview, 90-Tage-Plan |

## PDF

Die fertige, druckbare PDF (27 Seiten) liegt direkt im Repo:

➡️ **[Fitness-Guide.pdf](./Fitness-Guide.pdf)**

Alle Kapitel sind außerdem in einer Gesamt-Markdown-Datei zusammengefasst:

➡️ **[Fitness-Guide-Komplett.md](./Fitness-Guide-Komplett.md)**

### PDF neu erzeugen

Die PDF wurde mit Python (`markdown` + `weasyprint`) aus der Gesamtdatei generiert (Skript: [`build-pdf.py`](./build-pdf.py)):

```bash
pip install markdown weasyprint
python3 docs/fitness-guide/build-pdf.py
```

Alternativ mit Pandoc oder md-to-pdf:

```bash
# Variante Pandoc (LaTeX-Engine erforderlich)
pandoc docs/fitness-guide/Fitness-Guide-Komplett.md \
  -o Fitness-Guide.pdf \
  --toc --toc-depth=2 -V geometry:margin=2cm -V lang=de

# Variante md-to-pdf (Node)
npx md-to-pdf docs/fitness-guide/Fitness-Guide-Komplett.md
```

## Wichtige Einordnung

- Alle Nährwerte sind **Schätzwerte zur groben Orientierung** – sie sind bewusst praxisnah und nicht aufs Gramm genau. Für maximale Genauigkeit eine Tracking-App nutzen.
- Das System ist auf **langfristige Umsetzbarkeit (12+ Monate)** ausgelegt, nicht auf maximale theoretische Optimierung. Es darf zu ~90 % befolgt werden – das reicht für das Ziel.
- Die entscheidenden Hebel in absteigender Wichtigkeit: **Kaloriendefizit → Protein → Training/Progression → Ballaststoffe & Sättigung → Schritte (NEAT) → Schlaf.**
