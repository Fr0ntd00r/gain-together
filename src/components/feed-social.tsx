import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Heart } from "lucide-react";
import { useState } from "react";

// Gemeinsame Social-Bausteine für Feed-Liste und Feed-Detail.

export function LikeButton({ feedId }: { feedId: string }) {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["feed-like", feedId],
    queryFn: async () => {
      const { data: rows } = await supabase.from("feed_likes").select("user_id").eq("feed_id", feedId);
      const { data: { user } } = await supabase.auth.getUser();
      return {
        count: rows?.length ?? 0,
        liked: (rows ?? []).some((r: any) => r.user_id === user?.id),
      };
    },
  });
  async function toggle() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    if (data?.liked) await supabase.from("feed_likes").delete().eq("feed_id", feedId).eq("user_id", user.id);
    else await supabase.from("feed_likes").insert({ feed_id: feedId, user_id: user.id });
    qc.invalidateQueries({ queryKey: ["feed-like", feedId] });
    qc.invalidateQueries({ queryKey: ["feed-likes-counts"] });
  }
  return (
    <button onClick={toggle} className={`flex items-center gap-1 ${data?.liked ? "text-primary" : "text-muted-foreground"}`}>
      <Heart className={`h-4 w-4 ${data?.liked ? "fill-current" : ""}`} /> {data?.count ?? 0}
    </button>
  );
}

export function Comments({ feedId }: { feedId: string }) {
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
      {(data ?? []).length === 0 && (
        <div className="text-xs text-muted-foreground">Noch keine Kommentare – sei der Erste.</div>
      )}
      {(data ?? []).map((c: any) => (
        <div key={c.id} className="text-xs"><span className="font-medium">@{c.profiles?.username}</span> {c.content}</div>
      ))}
      <form onSubmit={submit} className="flex gap-2 pt-1">
        <input value={text} onChange={e => setText(e.target.value)} maxLength={500} placeholder="Kommentieren…"
          className="flex-1 rounded-lg border border-border bg-input px-3 py-1.5 text-xs" />
        <button type="submit" className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">Senden</button>
      </form>
    </div>
  );
}
