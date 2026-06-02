## Problem

Beim Auswählen eines Workouts (z.B. Template-Liste, die per RLS auf `is_friend(...)` zugreift) schlägt eine RLS-Policy fehl mit `permission denied for function is_friend`. Die Funktion ist zwar als `SECURITY DEFINER` definiert, aber die Rolle `authenticated` hat kein `EXECUTE`-Recht darauf — daher kann sie aus den RLS-Policies nicht aufgerufen werden.

`has_role` hat vermutlich dasselbe Problem und sollte vorsorglich mitgepatcht werden.

## Fix (eine Migration)

```sql
GRANT EXECUTE ON FUNCTION public.is_friend(uuid, uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, anon;
```

Keine Code-Änderungen im Frontend nötig. Nach der Migration verschwindet die Fehlermeldung und Templates/Feed-Abfragen funktionieren.
