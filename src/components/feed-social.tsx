import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Heart, Pencil, Trash2, Reply } from "lucide-react";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

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

type LikeMap = Record<string, { count: number; liked: boolean }>;

export function Comments({ feedId }: { feedId: string }) {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const { data: meId } = useQuery({
    queryKey: ["auth-uid"],
    queryFn: async () => (await supabase.auth.getUser()).data.user?.id ?? null,
  });
  const { data } = useQuery({
    queryKey: ["comments", feedId],
    queryFn: async () => {
      const { data: rows } = await supabase.from("feed_comments").select("*")
        .eq("feed_id", feedId).order("created_at");
      const list = rows ?? [];
      const ids = Array.from(new Set(list.map((c: any) => c.user_id)));
      let byId: Record<string, any> = {};
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles").select("id,username,display_name,avatar_url").in("id", ids);
        byId = Object.fromEntries((profs ?? []).map((p: any) => [p.id, p]));
      }
      return list.map((c: any) => ({ ...c, profiles: byId[c.user_id] }));
    },
  });

  const commentIds = (data ?? []).map((c: any) => c.id);
  const { data: likes } = useQuery({
    queryKey: ["comment-likes", feedId, commentIds.join(",")],
    enabled: commentIds.length > 0,
    queryFn: async () => {
      const { data: rows } = await supabase.from("comment_likes").select("comment_id,user_id").in("comment_id", commentIds);
      const { data: { user } } = await supabase.auth.getUser();
      const map: LikeMap = {};
      for (const id of commentIds) map[id] = { count: 0, liked: false };
      for (const r of rows ?? []) {
        if (!map[r.comment_id]) map[r.comment_id] = { count: 0, liked: false };
        map[r.comment_id].count++;
        if (r.user_id === user?.id) map[r.comment_id].liked = true;
      }
      return map;
    },
  });

  const topLevel = (data ?? []).filter((c: any) => !c.parent_id);
  const repliesByParent: Record<string, any[]> = {};
  for (const c of data ?? []) if (c.parent_id) (repliesByParent[c.parent_id] ??= []).push(c);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("feed_comments").insert({ feed_id: feedId, user_id: user!.id, content: text.trim() });
    setText("");
    qc.invalidateQueries({ queryKey: ["comments", feedId] });
    qc.invalidateQueries({ queryKey: ["feed-comment-counts"] });
  }

  return (
    <div className="mt-3 space-y-3 border-t border-border pt-3">
      {topLevel.length === 0 && (
        <div className="text-xs text-muted-foreground">Noch keine Kommentare – sei der Erste.</div>
      )}
      {topLevel.map((c: any) => (
        <CommentItem key={c.id} c={c} feedId={feedId} meId={meId ?? null} likes={likes} replies={repliesByParent[c.id] ?? []} />
      ))}
      <form onSubmit={submit} className="flex gap-2 pt-1">
        <input value={text} onChange={e => setText(e.target.value)} maxLength={500} placeholder="Kommentieren…"
          className="flex-1 rounded-lg border border-border bg-input px-3 py-1.5 text-xs" />
        <button type="submit" className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">Senden</button>
      </form>
    </div>
  );
}

function CommentItem({ c, feedId, meId, likes, replies = [], isReply = false }: {
  c: any; feedId: string; meId: string | null; likes?: LikeMap; replies?: any[]; isReply?: boolean;
}) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState("");
  const li = likes?.[c.id];
  const mine = meId === c.user_id;

  const refreshComments = () => {
    qc.invalidateQueries({ queryKey: ["comments", feedId] });
    qc.invalidateQueries({ queryKey: ["feed-comment-counts"] });
  };

  async function toggleLike() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    if (li?.liked) await supabase.from("comment_likes").delete().eq("comment_id", c.id).eq("user_id", user.id);
    else await supabase.from("comment_likes").insert({ comment_id: c.id, user_id: user.id });
    qc.invalidateQueries({ queryKey: ["comment-likes", feedId] });
  }
  async function saveEdit() {
    if (!editText.trim()) return;
    await supabase.from("feed_comments").update({ content: editText.trim(), edited_at: new Date().toISOString() }).eq("id", c.id);
    setEditing(false); setEditText("");
    qc.invalidateQueries({ queryKey: ["comments", feedId] });
  }
  async function remove() {
    if (typeof window !== "undefined" && !window.confirm("Kommentar löschen?")) return;
    await supabase.from("feed_comments").delete().eq("id", c.id);
    refreshComments();
  }
  async function submitReply(e: React.FormEvent) {
    e.preventDefault();
    if (!replyText.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("feed_comments").insert({ feed_id: feedId, user_id: user!.id, content: replyText.trim(), parent_id: c.id });
    setReplyText(""); setReplying(false);
    refreshComments();
  }

  return (
    <div className={isReply ? "ml-8" : ""}>
      <div className="flex items-start gap-2">
        <Avatar profile={c.profiles} size={isReply ? 24 : 28} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="truncate text-xs font-semibold">{c.profiles?.display_name ?? `@${c.profiles?.username ?? "?"}`}</span>
            <span className="shrink-0 text-[10px] text-muted-foreground">
              {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: de })}{c.edited_at ? " · bearbeitet" : ""}
            </span>
          </div>

          {editing ? (
            <div className="mt-1 space-y-1">
              <textarea value={editText} onChange={e => setEditText(e.target.value)} maxLength={500} rows={2}
                className="w-full rounded-lg border border-border bg-input px-2 py-1.5 text-sm" />
              <div className="flex gap-2">
                <button onClick={saveEdit} className="rounded-lg bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">Speichern</button>
                <button onClick={() => { setEditing(false); setEditText(""); }} className="rounded-lg border border-border px-3 py-1 text-xs">Abbrechen</button>
              </div>
            </div>
          ) : (
            <>
              <div className="break-words text-sm">{c.content}</div>
              <div className="mt-1 flex items-center gap-3 text-[11px]">
                <button onClick={toggleLike} className={`flex items-center gap-1 ${li?.liked ? "text-primary" : "text-muted-foreground"}`}>
                  <Heart className={`h-3 w-3 ${li?.liked ? "fill-current" : ""}`} /> {li?.count ?? 0}
                </button>
                {!isReply && (
                  <button onClick={() => setReplying(v => !v)} className="flex items-center gap-1 text-muted-foreground">
                    <Reply className="h-3 w-3" /> Antworten
                  </button>
                )}
                {mine && (
                  <>
                    <button onClick={() => { setEditing(true); setEditText(c.content); }} className="flex items-center gap-1 text-muted-foreground"><Pencil className="h-3 w-3" /> Bearbeiten</button>
                    <button onClick={remove} className="flex items-center gap-1 text-muted-foreground"><Trash2 className="h-3 w-3" /> Löschen</button>
                  </>
                )}
              </div>
            </>
          )}

          {replying && (
            <form onSubmit={submitReply} className="mt-2 flex gap-2">
              <input value={replyText} onChange={e => setReplyText(e.target.value)} maxLength={500} placeholder="Antworten…"
                className="flex-1 rounded-lg border border-border bg-input px-3 py-1.5 text-xs" />
              <button type="submit" className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">Senden</button>
            </form>
          )}
        </div>
      </div>

      {replies.length > 0 && (
        <div className="mt-2 space-y-2">
          {replies.map((r: any) => (
            <CommentItem key={r.id} c={r} feedId={feedId} meId={meId} likes={likes} isReply />
          ))}
        </div>
      )}
    </div>
  );
}

// Kleiner runder Avatar: Bild, sonst Initiale aus Anzeigename/Username.
export function Avatar({ profile, size = 28 }: { profile?: { display_name?: string | null; username?: string | null; avatar_url?: string | null } | null; size?: number }) {
  const label = profile?.display_name ?? profile?.username ?? "?";
  const initial = label.trim().charAt(0).toUpperCase() || "?";
  if (profile?.avatar_url) {
    return <img src={profile.avatar_url} alt={label} style={{ width: size, height: size }} className="shrink-0 rounded-full object-cover" />;
  }
  return (
    <div style={{ width: size, height: size }} className="grid shrink-0 place-items-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
      {initial}
    </div>
  );
}
