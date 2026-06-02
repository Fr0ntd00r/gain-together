## Ziel
Eine Fitness-App zum Tracken von Workouts und Fortschritten, mit kuratierten + KI-generierten Trainingsplänen, automatischen Progressions-Vorschlägen sowie Community-Features (Freunde-Feed, Achievements, Challenges & Leaderboards).

## Tech-Setup
- Lovable Cloud (Datenbank, Auth, Storage)
- Auth: E-Mail/Passwort + Google Sign-In
- Lovable AI Gateway für Trainings-Generierung & Progressions-Logik
- TanStack Start (React) mit geschützten Routen unter `_authenticated/`

## Datenmodell (Lovable Cloud)
- `profiles` — Username, Avatar, Bio, Level/Ziel, Equipment
- `exercises` — Übungs-Bibliothek (Name, Muskelgruppe, Equipment, Anleitung)
- `workout_templates` + `template_exercises` — Vorlagen (PPL, Upper/Lower, Full Body, KI-generierte)
- `workouts` — geloggte Trainings-Sessions (Datum, Dauer, Notizen)
- `workout_sets` — einzelne Sätze (Übung, Gewicht, Wdh, RPE)
- `personal_records` — automatisch berechnete PRs pro Übung
- `friendships` — Freundschafts-Anfragen/Verbindungen
- `activity_feed` — Feed-Einträge (Workout abgeschlossen, PR, Achievement)
- `achievements` + `user_achievements` — Badge-System
- `challenges` + `challenge_participants` — Challenges mit Leaderboard
- `likes`, `comments` — Interaktion im Feed
- `user_roles` (separat) — Rollen-System (admin/user)

Alle Tabellen mit RLS, GRANTs und Policies auf `auth.uid()` gescopet.

## Seiten / Routen
**Public**
- `/` Landing
- `/auth` Login/Signup (E-Mail + Google)

**Authenticated** (`_authenticated/`)
- `/dashboard` Übersicht: heutiges Workout, Streak, letzte PRs, Feed-Highlights
- `/workout/new` Workout starten (aus Vorlage, KI, oder leer)
- `/workout/$id` Live-Tracking: Sätze loggen, Timer, Progressions-Hinweise
- `/templates` Vorlagen-Bibliothek (kuratiert + eigene + KI-Coach)
- `/templates/$id` Vorlagen-Detail/Editor
- `/history` Trainings-Historie mit Filter
- `/progress` Statistiken: Volumen-Charts, PR-Verlauf pro Übung
- `/exercises` Übungs-Bibliothek
- `/feed` Activity-Feed (Freunde)
- `/friends` Freunde suchen/hinzufügen/verwalten
- `/profile/$username` Öffentliches Profil (Stats, Achievements)
- `/challenges` Liste & Beitritt
- `/challenges/$id` Detail + Leaderboard
- `/settings` Profil, Ziele, Equipment

## Kern-Logik
**Progressions-Engine** (Server Function): nach Workout-Abschluss analysiert sie pro Übung die letzten Sessions und schlägt für nächstes Mal vor:
- Alle Sätze mit Ziel-Wdh geschafft → +2.5 kg (Compound) / +1 kg (Isolation)
- Knapp geschafft → gleiche Last, +1 Wdh
- Nicht geschafft → Deload-Hinweis
- RPE-basiert wenn vorhanden

**KI-Coach** (Lovable AI Gateway):
- Generiert Trainingsplan aus Ziel/Level/Tage/Equipment
- Schlägt Übungs-Alternativen vor
- Erklärt Form/Technik on demand

**Achievement-Engine**: Trigger bei Workout-Abschluss prüft Regeln (z. B. „10 Workouts in 30 Tagen", „erstes 100 kg Bankdrücken", „7-Tage-Streak") und vergibt Badges automatisch.

**Challenges**: zeitlich begrenzt (z. B. „Most Volume August", „30 Workouts in 30 Tagen"). Leaderboard berechnet sich aus Workout-Daten der Teilnehmer.

## Design
Modern, dunkles Sport-Theme mit kräftigem Akzent (Energy/Performance-Feeling). Mobile-first, große Touch-Targets fürs Loggen im Gym. Semantische Tokens in `src/styles.css` (oklch).

## Reihenfolge (Implementation)
1. Lovable Cloud aktivieren, Auth (E-Mail + Google), Profile-Tabelle + Trigger
2. Datenbank-Schema komplett (alle Tabellen + RLS + GRANTs)
3. Übungs-Bibliothek + Seeding mit ~80 Standard-Übungen
4. Workout-Tracking (Start, Live-Logging, Speichern)
5. Vorlagen (kuratiert + eigene)
6. Progressions-Engine + PR-Tracking
7. KI-Coach (Plan-Generierung)
8. Statistiken/Charts (`/progress`, `/history`)
9. Freunde + Activity Feed
10. Achievement-System
11. Challenges + Leaderboards
12. Polish, Onboarding, Empty States

## Hinweise
- Großer Umfang — wird in mehreren Iterationen gebaut. Ich starte mit Auth + Schema + Tracking-Kern und baue dann schrittweise weiter aus, damit du frühzeitig Feedback geben kannst.
- Google-Login wird über Lovable Cloud konfiguriert.
