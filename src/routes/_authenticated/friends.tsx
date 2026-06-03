import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { UserPlus, Check, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/friends")({
  head: () => ({ meta: [{ title: "Freunde — FitForge" }] }),
  component: Friends,
});

function Friends() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: me } = useQuery({
    queryKey: ["self-user"],
    queryFn: async () => (await supabase.auth.getUser()).data.user,
  });

  const { data: friendships } = useQuery({
    queryKey: ["friendships"],
    enabled: !!me,
    queryFn: async () => {
      const { data: rows } = await supabase.from("friendships").select("*")
        .or(`requester_id.eq.${me!.id},addressee_id.eq.${me!.id}`);
      const list = rows ?? [];
      const ids = Array.from(new Set(list.flatMap((f: any) => [f.requester_id, f.addressee_id])));
      let byId: Record<string, any> = {};
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles").select("id,username,display_name,avatar_url").in("id", ids);
        byId = Object.fromEntries((profs ?? []).map((p: any) => [p.id, p]));
      }
      return list.map((f: any) => ({ ...f, requester: byId[f.requester_id], addressee: byId[f.addressee_id] }));
    },
  });

  const { data: searchResults } = useQuery({
    queryKey: ["search-users", search],
    enabled: search.length >= 2,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id,username,display_name,avatar_url")
        .ilike("username", `%${search}%`).neq("id", me!.id).limit(20);
      return data ?? [];
    },
  });

  const pendingIn = (friendships ?? []).filter((f: any) => f.status === "pending" && f.addressee_id === me?.id);
  const accepted = (friendships ?? []).filter((f: any) => f.status === "accepted");
  const pendingOut = (friendships ?? []).filter((f: any) => f.status === "pending" && f.requester_id === me?.id);

  async function request(addresseeId: string) {
    const { error } = await supabase.from("friendships").insert({ requester_id: me!.id, addressee_id: addresseeId, status: "pending" });
    if (error) toast.error(error.message); else { toast.success("Anfrage gesendet"); qc.invalidateQueries(); }
  }
  async function respond(id: string, accept: boolean) {
    if (accept) await supabase.from("friendships").update({ status: "accepted" }).eq("id", id);
    else await supabase.from("friendships").delete().eq("id", id);
    qc.invalidateQueries();
  }
  async function remove(id: string) {
    await supabase.from("friendships").delete().eq("id", id);
    qc.invalidateQueries();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold tracking-tight">Freunde</h1>

      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Username suchen…"
        className="w-full rounded-xl border border-border bg-input px-4 py-2.5" />

      {search.length >= 2 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Suchergebnisse</h2>
          <div className="space-y-2">
            {(searchResults ?? []).map((p: any) => {
              const existing = (friendships ?? []).find((f: any) => f.requester_id === p.id || f.addressee_id === p.id);
              return (
                <div key={p.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
                  <div>
                    <div className="font-medium">{p.display_name ?? p.username}</div>
                    <div className="text-xs text-muted-foreground">@{p.username}</div>
                  </div>
                  {existing ? (
                    <span className="text-xs text-muted-foreground">{existing.status === "accepted" ? "Befreundet" : "Ausstehend"}</span>
                  ) : (
                    <button onClick={() => request(p.id)} className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
                      <UserPlus className="h-3 w-3" /> Hinzufügen
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {pendingIn.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Anfragen ({pendingIn.length})</h2>
          <div className="space-y-2">
            {pendingIn.map((f: any) => (
              <div key={f.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
                <div>
                  <div className="font-medium">{f.requester?.display_name ?? f.requester?.username}</div>
                  <div className="text-xs text-muted-foreground">@{f.requester?.username}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => respond(f.id, true)} className="grid h-8 w-8 place-items-center rounded-lg bg-success text-success-foreground"><Check className="h-4 w-4" /></button>
                  <button onClick={() => respond(f.id, false)} className="grid h-8 w-8 place-items-center rounded-lg bg-muted"><X className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Befreundet ({accepted.length})</h2>
        <div className="space-y-2">
          {accepted.length === 0 && <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Noch keine Freunde.</div>}
          {accepted.map((f: any) => {
            const other = f.requester_id === me?.id ? f.addressee : f.requester;
            return (
              <div key={f.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
                <div>
                  <div className="font-medium">{other?.display_name ?? other?.username}</div>
                  <div className="text-xs text-muted-foreground">@{other?.username}</div>
                </div>
                <button onClick={() => remove(f.id)} className="text-xs text-muted-foreground hover:text-destructive">Entfernen</button>
              </div>
            );
          })}
        </div>
      </section>

      {pendingOut.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Gesendete Anfragen</h2>
          <div className="space-y-2">
            {pendingOut.map((f: any) => (
              <div key={f.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-3 opacity-70">
                <div>
                  <div className="font-medium">{f.addressee?.display_name ?? f.addressee?.username}</div>
                  <div className="text-xs text-muted-foreground">wartet auf Bestätigung</div>
                </div>
                <button onClick={() => remove(f.id)} className="text-xs text-muted-foreground">Abbrechen</button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
