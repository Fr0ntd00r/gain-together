import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { startWorkout } from "@/lib/api/workouts.functions";
import {
  startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval,
  addWeeks, subWeeks, addMonths, subMonths, format, isToday, isSameMonth,
  differenceInCalendarDays, parseISO,
} from "date-fns";
import { de } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Settings2, Play, CalendarRange, X, Check, SkipForward, Trash2, ArrowRightLeft, Coffee, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/schedule")({
  head: () => ({ meta: [{ title: "Kalender — FitForge" }] }),
  component: SchedulePage,
});

type Template = { id: string; name: string };
type Rule = { id: string; mode: string; slot_index: number; template_id: string | null };
type Settings = { user_id: string; mode: string; cycle_length: number; anchor_date: string };
type Scheduled = {
  id: string; date: string; template_id: string | null; status: string; workout_id: string | null; note: string | null;
};

const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const ymd = (d: Date) => format(d, "yyyy-MM-dd");
const weekdayIndex = (d: Date) => (d.getDay() + 6) % 7; // Mo=0 … So=6
const SENTINEL = "1900-01-01"; // Hilfsdatum für Tausch (umgeht UNIQUE-Konflikt)

function SchedulePage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const start = useServerFn(startWorkout);

  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => { supabase.auth.getUser().then(r => setUserId(r.data.user?.id ?? null)); }, []);

  const [view, setView] = useState<"week" | "month">("week");
  const [cursor, setCursor] = useState(() => new Date());
  const [rulesOpen, setRulesOpen] = useState(false);
  const [dayTarget, setDayTarget] = useState<string | null>(null); // ymd des angetippten Tages

  const { data: templates } = useQuery({
    queryKey: ["schedule-templates"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase.from("workout_templates")
        .select("id,name").or(`is_official.eq.true,is_public.eq.true,created_by.eq.${user?.id}`).order("name");
      return (data ?? []) as Template[];
    },
  });
  const tplName = useMemo(() => Object.fromEntries((templates ?? []).map(t => [t.id, t.name])), [templates]);

  const { data: settings } = useQuery({
    queryKey: ["schedule-settings", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase.from("schedule_settings").select("*").eq("user_id", userId!).maybeSingle();
      return (data ?? null) as Settings | null;
    },
  });

  const { data: rules } = useQuery({
    queryKey: ["schedule-rules", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase.from("schedule_rules").select("*").eq("user_id", userId!);
      return (data ?? []) as Rule[];
    },
  });

  const mode = settings?.mode ?? "weekly";
  const cycleLen = settings?.cycle_length ?? 3;
  const anchor = settings?.anchor_date ? parseISO(settings.anchor_date) : new Date();

  // Sichtbarer Zeitraum (Monatsansicht zeigt volle Wochen).
  const { gridStart, gridEnd, days } = useMemo(() => {
    if (view === "week") {
      const s = startOfWeek(cursor, { weekStartsOn: 1 });
      const e = endOfWeek(cursor, { weekStartsOn: 1 });
      return { gridStart: s, gridEnd: e, days: eachDayOfInterval({ start: s, end: e }) };
    }
    const s = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
    const e = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
    return { gridStart: s, gridEnd: e, days: eachDayOfInterval({ start: s, end: e }) };
  }, [view, cursor]);

  const { data: scheduled } = useQuery({
    queryKey: ["scheduled", userId, ymd(gridStart), ymd(gridEnd)],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase.from("scheduled_workouts").select("*")
        .eq("user_id", userId!).gte("date", ymd(gridStart)).lte("date", ymd(gridEnd)).order("date");
      return (data ?? []) as Scheduled[];
    },
  });
  const byDate = useMemo(() => Object.fromEntries((scheduled ?? []).map(s => [s.date, s])), [scheduled]);

  // Welche Vorlage schlägt die Regel für ein Datum vor?
  function plannedFor(d: Date): { templateId: string | null; hasRule: boolean } {
    const slot = mode === "weekly"
      ? weekdayIndex(d)
      : ((differenceInCalendarDays(d, anchor) % cycleLen) + cycleLen) % cycleLen;
    const rule = (rules ?? []).find(r => r.mode === mode && r.slot_index === slot);
    return rule ? { templateId: rule.template_id, hasRule: true } : { templateId: null, hasRule: false };
  }

  function refresh() {
    qc.invalidateQueries({ queryKey: ["scheduled"] });
    qc.invalidateQueries({ queryKey: ["schedule-today"] });
  }

  async function fillRange() {
    if (!userId) return;
    const rangeDays = view === "week"
      ? days
      : eachDayOfInterval({ start: startOfMonth(cursor), end: endOfMonth(cursor) });
    const rows = rangeDays
      .filter(d => !byDate[ymd(d)])
      .map(d => ({ d, p: plannedFor(d) }))
      .filter(x => x.p.hasRule)
      .map(x => ({ user_id: userId, date: ymd(x.d), template_id: x.p.templateId, status: "planned" }));
    if (rows.length === 0) {
      toast.info((rules ?? []).length === 0 ? "Lege zuerst eine Rotation/Regeln an." : "Keine offenen Tage zu füllen.");
      return;
    }
    const { error } = await supabase.from("scheduled_workouts").insert(rows);
    if (error) { toast.error(error.message); return; }
    toast.success(`${rows.length} Tag(e) geplant`);
    refresh();
  }

  const label = view === "week"
    ? `${format(gridStart, "d. MMM", { locale: de })} – ${format(gridEnd, "d. MMM yyyy", { locale: de })}`
    : format(cursor, "MMMM yyyy", { locale: de });

  function shift(dir: -1 | 1) {
    setCursor(c => view === "week" ? (dir === 1 ? addWeeks(c, 1) : subWeeks(c, 1)) : (dir === 1 ? addMonths(c, 1) : subMonths(c, 1)));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-3xl font-extrabold tracking-tight">Kalender</h1>
        <button onClick={() => setRulesOpen(true)}
          className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium">
          <Settings2 className="h-4 w-4" /> Rotation
        </button>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex rounded-xl border border-border p-0.5 text-sm">
          <button onClick={() => setView("week")} className={`rounded-lg px-3 py-1.5 ${view === "week" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Woche</button>
          <button onClick={() => setView("month")} className={`rounded-lg px-3 py-1.5 ${view === "month" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Monat</button>
        </div>
        <button onClick={fillRange} className="ml-auto flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-bold text-primary-foreground">
          <CalendarRange className="h-4 w-4" /> {view === "week" ? "Woche" : "Monat"} füllen
        </button>
      </div>

      <div className="flex items-center justify-between">
        <button onClick={() => shift(-1)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted"><ChevronLeft className="h-5 w-5" /></button>
        <div className="flex items-center gap-3">
          <span className="font-semibold capitalize">{label}</span>
          <button onClick={() => setCursor(new Date())} className="rounded-lg border border-border px-2 py-1 text-xs text-muted-foreground">Heute</button>
        </div>
        <button onClick={() => shift(1)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted"><ChevronRight className="h-5 w-5" /></button>
      </div>

      {view === "week" ? (
        <div className="space-y-2">
          {days.map(d => {
            const key = ymd(d);
            const entry = byDate[key];
            const plan = plannedFor(d);
            return (
              <button key={key} onClick={() => setDayTarget(key)}
                className={`flex w-full items-center gap-3 rounded-xl border bg-card p-3 text-left ${isToday(d) ? "border-primary" : "border-border"}`}>
                <div className="w-12 shrink-0 text-center">
                  <div className="text-[10px] uppercase text-muted-foreground">{WEEKDAYS[weekdayIndex(d)]}</div>
                  <div className={`text-lg font-bold ${isToday(d) ? "text-primary" : ""}`}>{format(d, "d")}</div>
                </div>
                <div className="min-w-0 flex-1">
                  {entry ? (
                    <EntryLabel entry={entry} tplName={tplName} />
                  ) : plan.hasRule ? (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Sparkles className="h-3.5 w-3.5" />
                      <span className="truncate">{plan.templateId ? tplName[plan.templateId] ?? "Plan" : "Ruhetag"} <span className="opacity-60">(Vorschlag)</span></span>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground/60">Frei – tippen zum Planen</span>
                  )}
                </div>
                {entry?.template_id && entry.status !== "done" && (
                  <span onClick={(e) => { e.stopPropagation(); startFromEntry(entry); }}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground"><Play className="h-4 w-4" /></span>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <div>
          <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[10px] uppercase text-muted-foreground">
            {WEEKDAYS.map(w => <div key={w}>{w}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map(d => {
              const key = ymd(d);
              const entry = byDate[key];
              const plan = plannedFor(d);
              const dim = !isSameMonth(d, cursor);
              return (
                <button key={key} onClick={() => setDayTarget(key)}
                  className={`flex min-h-16 flex-col gap-1 rounded-lg border p-1 text-left ${isToday(d) ? "border-primary" : "border-border"} ${dim ? "opacity-40" : ""}`}>
                  <div className={`text-xs font-semibold ${isToday(d) ? "text-primary" : ""}`}>{format(d, "d")}</div>
                  {entry ? (
                    entry.template_id ? (
                      <div className={`truncate rounded px-1 py-0.5 text-[9px] font-medium ${entry.status === "done" ? "bg-success/20 text-success" : "bg-primary/15 text-primary"}`}>
                        {tplName[entry.template_id] ?? "Plan"}
                      </div>
                    ) : (
                      <div className="truncate rounded bg-muted px-1 py-0.5 text-[9px] text-muted-foreground">Ruhe</div>
                    )
                  ) : plan.hasRule ? (
                    <div className="truncate rounded border border-dashed border-border px-1 py-0.5 text-[9px] text-muted-foreground">
                      {plan.templateId ? tplName[plan.templateId] ?? "Plan" : "Ruhe"}
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Gestrichelt = Vorschlag aus der Rotation. Mit „Monat füllen" übernehmen.</p>
        </div>
      )}

      {rulesOpen && userId && (
        <RuleEditor userId={userId} templates={templates ?? []} settings={settings ?? null} rules={rules ?? []}
          onClose={() => setRulesOpen(false)}
          onSaved={() => { setRulesOpen(false); qc.invalidateQueries({ queryKey: ["schedule-settings"] }); qc.invalidateQueries({ queryKey: ["schedule-rules"] }); }} />
      )}

      {dayTarget && userId && (
        <DayActions
          dateKey={dayTarget}
          entry={byDate[dayTarget] ?? null}
          suggestion={plannedFor(parseISO(dayTarget))}
          templates={templates ?? []}
          tplName={tplName}
          occupiedDates={new Set((scheduled ?? []).map(s => s.date))}
          userId={userId}
          onClose={() => setDayTarget(null)}
          onChanged={() => { refresh(); }}
          onStart={startFromEntry}
        />
      )}
    </div>
  );

  async function startFromEntry(entry: Scheduled) {
    if (!entry.template_id) { toast.error("Kein Plan für diesen Tag."); return; }
    // Bereits gestartetes (noch nicht abgeschlossenes) Workout fortsetzen statt neu anzulegen.
    if (entry.workout_id) { navigate({ to: "/workouts/$id", params: { id: entry.workout_id } }); return; }
    try {
      const r = await start({ data: { templateId: entry.template_id } });
      // Nur verknüpfen — als "erledigt" wird der Tag erst beim Abschluss des Workouts markiert.
      await supabase.from("scheduled_workouts").update({ workout_id: r.workoutId }).eq("id", entry.id);
      refresh();
      navigate({ to: "/workouts/$id", params: { id: r.workoutId } });
    } catch (e: any) { toast.error(e.message); }
  }
}

function EntryLabel({ entry, tplName }: { entry: Scheduled; tplName: Record<string, string> }) {
  return (
    <div className="flex items-center gap-2">
      {entry.template_id ? (
        <span className="truncate text-sm font-semibold">{tplName[entry.template_id] ?? "Plan"}</span>
      ) : (
        <span className="flex items-center gap-1 text-sm text-muted-foreground"><Coffee className="h-3.5 w-3.5" /> Ruhetag</span>
      )}
      {entry.workout_id && entry.status !== "done" && <span className="shrink-0 rounded bg-primary/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-primary">läuft</span>}
      {entry.status === "done" && <span className="shrink-0 rounded bg-success/20 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-success">erledigt</span>}
      {entry.status === "skipped" && <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[9px] font-semibold uppercase text-muted-foreground">übersprungen</span>}
    </div>
  );
}

function DayActions({ dateKey, entry, suggestion, templates, tplName, occupiedDates, userId, onClose, onChanged, onStart }: {
  dateKey: string; entry: Scheduled | null; suggestion: { templateId: string | null; hasRule: boolean };
  templates: Template[]; tplName: Record<string, string>; occupiedDates: Set<string>; userId: string;
  onClose: () => void; onChanged: () => void; onStart: (e: Scheduled) => void;
}) {
  const [moveTo, setMoveTo] = useState("");
  const [busy, setBusy] = useState(false);
  const dateLabel = format(parseISO(dateKey), "EEEE, d. MMMM yyyy", { locale: de });

  async function run(fn: () => Promise<any>) {
    setBusy(true);
    try { const { error } = await fn(); if (error) throw error; onChanged(); onClose(); }
    catch (e: any) { toast.error(e.message ?? String(e)); }
    finally { setBusy(false); }
  }

  async function assign(templateId: string | null) {
    await run(async () => {
      if (entry) return supabase.from("scheduled_workouts").update({ template_id: templateId, status: "planned" }).eq("id", entry.id);
      return supabase.from("scheduled_workouts").insert({ user_id: userId, date: dateKey, template_id: templateId, status: "planned" });
    });
  }
  async function setStatus(status: string) {
    if (!entry) return;
    await run(async () => supabase.from("scheduled_workouts").update({ status }).eq("id", entry.id));
  }
  async function remove() {
    if (!entry) return;
    await run(async () => supabase.from("scheduled_workouts").delete().eq("id", entry.id));
  }
  async function move() {
    if (!entry || !moveTo) return;
    setBusy(true);
    try {
      if (!occupiedDates.has(moveTo)) {
        const { error } = await supabase.from("scheduled_workouts").update({ date: moveTo }).eq("id", entry.id);
        if (error) throw error;
      } else {
        // Tausch über Hilfsdatum, damit UNIQUE(user_id,date) nicht verletzt wird.
        const { data: other } = await supabase.from("scheduled_workouts").select("id").eq("user_id", userId).eq("date", moveTo).maybeSingle();
        if (!other) throw new Error("Zieltag nicht gefunden");
        let { error } = await supabase.from("scheduled_workouts").update({ date: SENTINEL }).eq("id", entry.id); if (error) throw error;
        ({ error } = await supabase.from("scheduled_workouts").update({ date: dateKey }).eq("id", other.id)); if (error) throw error;
        ({ error } = await supabase.from("scheduled_workouts").update({ date: moveTo }).eq("id", entry.id)); if (error) throw error;
      }
      toast.success("Verschoben");
      onChanged(); onClose();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-background/80 sm:items-center sm:p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-border bg-card p-5 sm:rounded-3xl" onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between">
          <h2 className="text-base font-bold capitalize">{dateLabel}</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>

        {entry && (
          <div className="mb-4 rounded-xl bg-muted/50 p-3">
            <EntryLabel entry={entry} tplName={tplName} />
          </div>
        )}

        {entry?.template_id && entry.status !== "done" && (
          <button onClick={() => onStart(entry)} disabled={busy}
            className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-bold text-primary-foreground disabled:opacity-50">
            <Play className="h-4 w-4" /> {entry.workout_id ? "Training fortsetzen" : "Training starten"}
          </button>
        )}

        <label className="mb-3 block space-y-1">
          <span className="text-xs text-muted-foreground">Plan zuweisen</span>
          <select value={entry?.template_id ?? ""} disabled={busy}
            onChange={e => assign(e.target.value || null)}
            className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm">
            <option value="">— Ruhetag —</option>
            {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </label>

        {!entry && suggestion.hasRule && (
          <button onClick={() => assign(suggestion.templateId)} disabled={busy}
            className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl border border-border py-2.5 text-sm font-medium">
            <Sparkles className="h-4 w-4" /> Vorschlag übernehmen ({suggestion.templateId ? tplName[suggestion.templateId] ?? "Plan" : "Ruhetag"})
          </button>
        )}

        {entry && (
          <>
            <div className="mb-3 flex gap-2">
              <button onClick={() => setStatus(entry.status === "done" ? "planned" : "done")} disabled={busy}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border py-2.5 text-sm">
                <Check className="h-4 w-4" /> {entry.status === "done" ? "Offen" : "Erledigt"}
              </button>
              <button onClick={() => setStatus(entry.status === "skipped" ? "planned" : "skipped")} disabled={busy}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border py-2.5 text-sm">
                <SkipForward className="h-4 w-4" /> {entry.status === "skipped" ? "Offen" : "Überspringen"}
              </button>
            </div>

            <div className="mb-3 space-y-1">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><ArrowRightLeft className="h-3.5 w-3.5" /> Verschieben auf</span>
              <div className="flex gap-2">
                <input type="date" value={moveTo} onChange={e => setMoveTo(e.target.value)}
                  className="flex-1 rounded-lg border border-border bg-input px-3 py-2 text-sm" />
                <button onClick={move} disabled={busy || !moveTo} className="rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50">OK</button>
              </div>
            </div>

            <button onClick={remove} disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-border py-2.5 text-sm text-destructive">
              <Trash2 className="h-4 w-4" /> Aus Kalender entfernen
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function RuleEditor({ userId, templates, settings, rules, onClose, onSaved }: {
  userId: string; templates: Template[]; settings: Settings | null; rules: Rule[];
  onClose: () => void; onSaved: () => void;
}) {
  const [mode, setMode] = useState<"weekly" | "cycle">((settings?.mode as any) ?? "weekly");
  const [cycleLen, setCycleLen] = useState(settings?.cycle_length ?? 3);
  const [anchor, setAnchor] = useState(settings?.anchor_date ?? ymd(new Date()));
  const [saving, setSaving] = useState(false);

  // Slot-Werte: "" = Ruhetag, "none" = nicht geplant, sonst template_id.
  const slotCount = mode === "weekly" ? 7 : cycleLen;
  const [slots, setSlots] = useState<string[]>([]);
  useEffect(() => {
    const arr: string[] = [];
    for (let i = 0; i < slotCount; i++) {
      const rule = rules.find(r => r.mode === mode && r.slot_index === i);
      arr.push(rule ? (rule.template_id ?? "rest") : "none");
    }
    setSlots(arr);
  }, [mode, slotCount, rules]);

  async function save() {
    setSaving(true);
    try {
      let { error } = await supabase.from("schedule_settings").upsert(
        { user_id: userId, mode, cycle_length: cycleLen, anchor_date: anchor }, { onConflict: "user_id" });
      if (error) throw error;
      ({ error } = await supabase.from("schedule_rules").delete().eq("user_id", userId).eq("mode", mode));
      if (error) throw error;
      const rows = slots
        .map((v, i) => ({ v, i }))
        .filter(x => x.v !== "none")
        .map(x => ({ user_id: userId, mode, slot_index: x.i, template_id: x.v === "rest" ? null : x.v }));
      if (rows.length) { ({ error } = await supabase.from("schedule_rules").insert(rows)); if (error) throw error; }
      toast.success("Rotation gespeichert");
      onSaved();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-background/80 sm:items-center sm:p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-border bg-card sm:rounded-3xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="text-lg font-bold">Rotation / Regeln</h2>
          <button onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>

        <div className="space-y-4 p-4">
          <div className="flex rounded-xl border border-border p-0.5 text-sm">
            <button onClick={() => setMode("weekly")} className={`flex-1 rounded-lg px-3 py-1.5 ${mode === "weekly" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Wochenplan</button>
            <button onClick={() => setMode("cycle")} className={`flex-1 rounded-lg px-3 py-1.5 ${mode === "cycle" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Rotation</button>
          </div>

          {mode === "weekly" ? (
            <p className="text-xs text-muted-foreground">Lege fest, welcher Plan an welchem Wochentag trainiert wird.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1">
                <span className="text-xs text-muted-foreground">Zyklus-Länge (Tage)</span>
                <input type="number" min={1} max={31} value={cycleLen}
                  onChange={e => setCycleLen(Math.max(1, Math.min(31, Number(e.target.value) || 1)))}
                  className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm" />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-muted-foreground">Start (Tag 1)</span>
                <input type="date" value={anchor} onChange={e => setAnchor(e.target.value)}
                  className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm" />
              </label>
            </div>
          )}

          <div className="space-y-2">
            {slots.map((val, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-20 shrink-0 text-sm font-medium text-muted-foreground">
                  {mode === "weekly" ? ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"][i] : `Tag ${i + 1}`}
                </div>
                <select value={val} onChange={e => setSlots(s => s.map((v, idx) => idx === i ? e.target.value : v))}
                  className="min-w-0 flex-1 rounded-lg border border-border bg-input px-3 py-2 text-sm">
                  <option value="none">— nicht geplant —</option>
                  <option value="rest">Ruhetag</option>
                  {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-border p-4">
          <button onClick={save} disabled={saving}
            className="w-full rounded-xl bg-primary py-3 font-bold text-primary-foreground disabled:opacity-50">
            {saving ? "Speichert…" : "Rotation speichern"}
          </button>
        </div>
      </div>
    </div>
  );
}
