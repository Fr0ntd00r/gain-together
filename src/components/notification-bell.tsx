import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Bell } from "lucide-react";

// Anzahl ungelesener Mitteilungen (für den Badge). Pollt minütlich.
export function useUnreadCount() {
  return useQuery({
    queryKey: ["notif-unread"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;
      const { count } = await supabase.from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id).is("read_at", null);
      return count ?? 0;
    },
    refetchInterval: 60_000,
  });
}

export function NotificationBell({ className }: { className?: string }) {
  const { data: count } = useUnreadCount();
  const n = count ?? 0;
  return (
    <Link to="/notifications"
      aria-label="Mitteilungen"
      className={`relative grid h-10 w-10 place-items-center rounded-xl border border-border ${className ?? ""}`}>
      <Bell className="h-4 w-4" />
      {n > 0 && (
        <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
          {n > 9 ? "9+" : n}
        </span>
      )}
    </Link>
  );
}
