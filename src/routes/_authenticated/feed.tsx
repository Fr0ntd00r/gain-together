import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Heart, MessageCircle, Trophy, Dumbbell, Award, Flame, Users } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/feed")({
  head: () => ({ meta: [{ title: "Feed — FitForge" }] }),
  component: Feed,
});

function Feed() {
  const qc = useQueryClient();
  const { data: feed } = useQuery({
    queryKey: ["feed"],
    queryFn: async () => {
      const { data: rows } = await supabase.from("activity_feed").select("*")
        .order("created_at", { ascending: false }).limit(50);
      const list = rows ?? [];
      const ids = Array.from(new Set(list.map((r: any) => r.user_id)));
      let byId: Record<string, any> = {};
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles").select("id,username,display_name,avatar_url").in("id", ids);
        byId = Object.fromEntries((profs ?? []).map((p: any) => [p.id, p]));
      }
      return list.map((r: any) => ({ ...r, profiles: byId[r.user_id] }));
    },
  });

  const { data: likeCounts } = useQuery({
    queryKey: ["feed-likes-counts", (feed ?? []).map((f: any) => f.id).join(",")],
    enabled: (feed ?? []).length > 0,
    queryFn: async () => {
      const ids = (feed ?? []).map((f: any) => f.id);
      const { data } = await supabase.from("feed_likes").select("feed_id, user_id").in("feed_id", ids);
      const { data: { user } } = await supabase.auth.getUser();
      const counts: Record<string, { count: number; liked: boolean }> = {};
      for (const id of ids) counts[id] = { count: 0, liked: false };
      for (const l of data ?? []) {
        counts[l.feed_id].count++;
        if (l.user_id === user!.id) counts[l.feed_id].liked = true;
      }
      return counts;
    },
  });

  async function toggleLike(feedId: string, liked: boolean) {
    const { data: { user } } = await supabase.auth.getUser();
    if (liked) {
      await supabase.from("feed_likes").delete().eq("feed_id", feedId).eq("user_id", user!.id);
    } else {
      await supabase.from("feed_likes").insert({ feed_id: feedId, user_id: user!.id });
    }
    qc.invalidateQueries({ queryKey: ["feed-likes-counts"] });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-3xl font-extrabold tracking-tight">Feed</h1>
        <Link to="/friends" className="flex shrink-0 items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium">
          <Users className="h-4 w-4" /> Freunde
        </Link>
      </div>
      {(feed ?? []).length === 0 && (
        <Link to="/friends" className="block rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground hover:border-primary">
          Folge Freunden, um ihren Fortschritt zu sehen.
          <span className="mt-2 flex items-center justify-center gap-1.5 font-medium text-primary"><Users className="h-4 w-4" /> Freunde finden &amp; hinzufügen</span>
        </Link>
      )}
      {(feed ?? []).map((item: any) => (
        <FeedItem key={item.id} item={item} likes={likeCounts?.[item.id]} onToggle={toggleLike} />
      ))}
    </div>
  );
}

function FeedItem({ item, likes, onToggle }: any) {
  const [showComments, setShowComments] = useState(false);
  const p = item.profiles;
  const Icon = item.event_type === "personal_record" ? Trophy
    : item.event_type === "achievement_unlocked" ? Award
    : item.event_type === "challenge_completed" ? Flame
    : Dumbbell;
  let title = "Workout abgeschlossen";
  let body: string | null = null;
  if (item.event_type === "workout_completed") {
    title = `${p?.display_name ?? p?.username} hat trainiert`;
    body = `${item.data?.name} · ${Math.round(item.data?.volume ?? 0)} kg · ${item.data?.sets ?? 0} Sätze`;
  } else if (item.event_type === "personal_record") {
    title = `${p?.display_name ?? p?.username} hat einen PR aufgestellt`;
    body = `${Number(item.data?.value).toFixed(1)} kg 💪`;
  } else if (item.event_type === "achievement_unlocked") {
    title = `${p?.display_name ?? p?.username} hat ein Achievement freigeschaltet`;
    body = `🏅 ${item.data?.name}`;
  } else if (item.event_type === "challenge_completed") {
    title = `${p?.display_name ?? p?.username} hat eine Challenge abgeschlossen`;
    body = `🏆 ${item.data?.name}`;
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/15">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold">{title}</div>
          {body && <div className="text-sm text-muted-foreground">{body}</div>}
          <div className="mt-1 text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: de })}</div>
          <div className="mt-3 flex gap-4 text-xs">
            <button onClick={() => onToggle(item.id, likes?.liked ?? false)}
              className={`flex items-center gap-1 ${likes?.liked ? "text-primary" : "text-muted-foreground"}`}>
              <Heart className={`h-4 w-4 ${likes?.liked ? "fill-current" : ""}`} /> {likes?.count ?? 0}
            </button>
            <button onClick={() => setShowComments(s => !s)} className="flex items-center gap-1 text-muted-foreground">
              <MessageCircle className="h-4 w-4" /> Kommentar
            </button>
          </div>
          {showComments && <Comments feedId={item.id} />}
        </div>
      </div>
    </div>
  );
}

function Comments({ feedId }: { feedId: string }) {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const { data } = useQuery({
    queryKey: ["comments", feedId],
    queryFn: async () => {
      const { data: rows } = await supabase.from("feed_comments").select("*")
        .eq("feed_id", feedId).order("created_at");
      const list = rows ?? [];
      const ids = Array.from(new Set(list.map((c: any) => c.user_id)));
      let byId: Record<string, any> = {};
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles").select("id,username,display_name").in("id", ids);
        byId = Object.fromEntries((profs ?? []).map((p: any) => [p.id, p]));
      }
      return list.map((c: any) => ({ ...c, profiles: byId[c.user_id] }));
    },
  });
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("feed_comments").insert({ feed_id: feedId, user_id: user!.id, content: text });
    setText("");
    qc.invalidateQueries({ queryKey: ["comments", feedId] });
  }
  return (
    <div className="mt-3 space-y-2 border-t border-border pt-3">
      {(data ?? []).map((c: any) => (
        <div key={c.id} className="text-xs"><span className="font-medium">@{c.profiles?.username}</span> {c.content}</div>
      ))}
      <form onSubmit={submit} className="flex gap-2">
        <input value={text} onChange={e => setText(e.target.value)} maxLength={500} placeholder="Kommentieren…"
          className="flex-1 rounded-lg border border-border bg-input px-3 py-1.5 text-xs" />
        <button type="submit" className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">Senden</button>
      </form>
    </div>
  );
}
