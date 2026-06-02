-- Support pausing/resuming a workout and an accurate elapsed timer.
-- accumulated_seconds: time banked from finished run segments (before the current one).
-- is_paused: true while the workout clock is stopped.
-- last_resumed_at: timestamp the current running segment started (= started_at initially,
--                  updated every time the workout is resumed).
ALTER TABLE public.workouts
  ADD COLUMN IF NOT EXISTS accumulated_seconds INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_paused BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_resumed_at TIMESTAMPTZ;

-- Backfill existing in-progress workouts so the timer keeps working.
UPDATE public.workouts SET last_resumed_at = started_at WHERE last_resumed_at IS NULL;
