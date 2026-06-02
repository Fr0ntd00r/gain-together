// Shared helpers for the pause-aware workout clock.
// The elapsed time of a workout = seconds banked from earlier run segments
// (accumulated_seconds) plus the current running segment (now - last_resumed_at),
// where the running segment only counts while the workout is not paused.

export type TimedWorkout = {
  started_at: string;
  last_resumed_at?: string | null;
  accumulated_seconds?: number | null;
  is_paused?: boolean | null;
  is_completed?: boolean | null;
  duration_seconds?: number | null;
};

export function elapsedSeconds(w: TimedWorkout, nowMs: number = Date.now()): number {
  if (w.is_completed) return Math.max(0, Number(w.duration_seconds ?? 0));
  const banked = Number(w.accumulated_seconds ?? 0);
  if (w.is_paused) return Math.max(0, banked);
  const segmentStart = w.last_resumed_at ? new Date(w.last_resumed_at).getTime() : new Date(w.started_at).getTime();
  return Math.max(0, banked + Math.floor((nowMs - segmentStart) / 1000));
}

export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}
