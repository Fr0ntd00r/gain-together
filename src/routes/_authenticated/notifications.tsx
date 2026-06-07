import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Heart, MessageCircle, Bell } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { Avatar } from "@/components/feed-social";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({ meta: [{ title: "Mitteilungen — FitForge" }] }),
  component: Notifications,
});

function Notifications() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data: rows } = await supabase.from("notifications").select("*")
        .order("created_at", { ascending: false }).limit(100);
      const list = rows ?? [];
      const ids = Array.from(new Set(list.map((n: any) => n.actor_id).filter(Boolean)));
      let byId: Record<string, any> = {};
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles").select("id,username,display_name,avatar_url").in("id", ids);
        byId = Object.fromEntries((profs ?? []).map((p: any) => [p.id, p]));
      }
      return list.map((n: any) => ({ ...n, actor: byId[n.actor_id] }));
    },
  });

  // Beim Öffnen alle als gelesen markieren.
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("notifications").update({ read_at: new Date().toISOString() })
        .eq("user_id", user.id).is("read_at", null);
      qc.invalidateQueries({ queryKey: ["notif-unread"] });
    })();
  }, [qc]);

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-extrabold tracking-tight">Mitteilungen</h1>

      {isLoading && <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">Lädt…</div>}
      {!isLoading && (data ?? []).length === 0 && (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          <Bell className="mx-auto mb-2 h-6 w-6" />
          Noch keine Mitteilungen. Likes und Kommentare zu deinen Aktivitäten erscheinen hier.
        </div>
      )}

      {(data ?? []).map((n: any) => {
        const name = n.actor?.display_name ?? n.actor?.username ?? "Jemand";
        const verb = n.type === "like" ? "gefällt deine Aktivität" : "hat deine Aktivität kommentiert";
        const Icon = n.type === "like" ? Heart : MessageCircle;
        const body = (
          <div className={`flex items-start gap-3 rounded-2xl border border-border p-4 ${n.read_at ? "bg-card" : "bg-primary/5"}`}>
            <Avatar profile={n.actor} size={36} />
            <div className="min-w-0 flex-1">
              <div className="text-sm"><span className="font-semibold">{name}</span> {verb}</div>
              <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                <Icon className="h-3 w-3" />
                {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: de })}
              </div>
            </div>
            {!n.read_at && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />}
          </div>
        );
        return n.feed_id
          ? <Link key={n.id} to="/feed/$id" params={{ id: n.feed_id }}>{body}</Link>
          : <div key={n.id}>{body}</div>;
      })}
    </div>
  );
}
