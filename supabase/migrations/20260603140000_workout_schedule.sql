-- Trainingsplanung: Rotation/Regeln + konkreter, verschiebbarer Kalender.
-- Idempotent. RLS: jeder sieht/ändert nur eigene Daten.

-- Einstellungen (eine Zeile pro Nutzer)
CREATE TABLE IF NOT EXISTS public.schedule_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  mode TEXT NOT NULL DEFAULT 'weekly' CHECK (mode IN ('weekly','cycle')),
  cycle_length INT NOT NULL DEFAULT 3 CHECK (cycle_length BETWEEN 1 AND 31),
  anchor_date DATE NOT NULL DEFAULT current_date,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Regeln: pro Modus und Slot ein (optionaler) Plan.
-- weekly: slot_index 0..6 = Mo..So.  cycle: slot_index 0..(cycle_length-1) ab anchor_date.
-- template_id NULL = Ruhetag.
CREATE TABLE IF NOT EXISTS public.schedule_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode TEXT NOT NULL CHECK (mode IN ('weekly','cycle')),
  slot_index INT NOT NULL,
  template_id UUID REFERENCES public.workout_templates(id) ON DELETE SET NULL,
  UNIQUE (user_id, mode, slot_index)
);
CREATE INDEX IF NOT EXISTS schedule_rules_user_idx ON public.schedule_rules(user_id);

-- Konkrete, verschiebbare Kalendereinträge (eine pro Tag).
CREATE TABLE IF NOT EXISTS public.scheduled_workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  template_id UUID REFERENCES public.workout_templates(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','done','skipped')),
  workout_id UUID REFERENCES public.workouts(id) ON DELETE SET NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);
CREATE INDEX IF NOT EXISTS scheduled_workouts_user_date_idx ON public.scheduled_workouts(user_id, date);

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.schedule_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.schedule_rules TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scheduled_workouts TO authenticated;
GRANT ALL ON public.schedule_settings TO service_role;
GRANT ALL ON public.schedule_rules TO service_role;
GRANT ALL ON public.scheduled_workouts TO service_role;

-- RLS
ALTER TABLE public.schedule_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_workouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sched_settings own" ON public.schedule_settings;
CREATE POLICY "sched_settings own" ON public.schedule_settings FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "sched_rules own" ON public.schedule_rules;
CREATE POLICY "sched_rules own" ON public.schedule_rules FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "sched_workouts own" ON public.scheduled_workouts;
CREATE POLICY "sched_workouts own" ON public.scheduled_workouts FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- updated_at Trigger (touch_updated_at existiert bereits)
DROP TRIGGER IF EXISTS trg_sched_settings_updated ON public.schedule_settings;
CREATE TRIGGER trg_sched_settings_updated BEFORE UPDATE ON public.schedule_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_sched_workouts_updated ON public.scheduled_workouts;
CREATE TRIGGER trg_sched_workouts_updated BEFORE UPDATE ON public.scheduled_workouts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
