import { toUserMessage } from "@/lib/errors";
import { useEffect, useState } from "react";
import { Bell, Loader2, CheckCheck, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import type { Database } from "@/integrations/supabase/types";

type Notification = Database["public"]["Tables"]["notifications"]["Row"];

const TYPE_GRADIENT: Record<string, string> = {
  match: "bg-gradient-impact",
  application: "bg-gradient-trust",
  message: "bg-gradient-trust",
  urgent: "bg-gradient-energy",
  system: "bg-muted",
};

const Notifications = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (!active) return;
      if (error) toast({ title: "Couldn't load notifications", description: toUserMessage(error), variant: "destructive" });
      setItems((data ?? []) as Notification[]);
      setLoading(false);
    })();

    const channel = supabase
      .channel("notifications-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, (payload) => {
        setItems((prev) => {
          if (payload.eventType === "INSERT") return [payload.new as Notification, ...prev];
          if (payload.eventType === "UPDATE")
            return prev.map((n) => (n.id === (payload.new as Notification).id ? (payload.new as Notification) : n));
          if (payload.eventType === "DELETE") return prev.filter((n) => n.id !== (payload.old as Notification).id);
          return prev;
        });
      })
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [user]);

  const markAllRead = async () => {
    if (!user) return;
    const { error } = await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    if (error) toast({ title: "Couldn't update", description: toUserMessage(error), variant: "destructive" });
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("notifications").delete().eq("id", id);
    if (error) toast({ title: "Couldn't delete", description: toUserMessage(error), variant: "destructive" });
  };

  const unreadCount = items.filter((n) => !n.read).length;

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl px-5 pt-8 pb-6 space-y-5">
        <header className="flex items-end justify-between animate-fade-up">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Inbox</p>
            <h1 className="text-3xl font-display font-bold">Notifications</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up."}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button variant="soft" size="sm" onClick={markAllRead}>
              <CheckCheck className="h-4 w-4" /> Mark all
            </Button>
          )}
        </header>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-3xl bg-card border border-border p-10 text-center animate-fade-up">
            <div className="h-16 w-16 rounded-2xl bg-gradient-impact mx-auto flex items-center justify-center text-primary-foreground mb-3">
              <Bell className="h-7 w-7" />
            </div>
            <h2 className="font-display text-lg font-bold">Quiet for now</h2>
            <p className="text-sm text-muted-foreground mt-1">We'll ping you when matches or urgent needs arrive.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((n) => (
              <NotificationRow key={n.id} n={n} onDelete={() => remove(n.id)} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
};

const NotificationRow = ({ n, onDelete }: { n: Notification; onDelete: () => void }) => {
  const Wrap = n.link ? Link : ("div" as any);
  const wrapProps = n.link ? { to: n.link } : {};

  const content = (
    <>
      <div className={cn("h-10 w-10 rounded-2xl flex items-center justify-center text-white shrink-0", TYPE_GRADIENT[n.type] ?? TYPE_GRADIENT.system)}>
        <Bell className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className={cn("font-semibold text-sm truncate", !n.read && "text-foreground")}>{n.title}</h3>
          {!n.read && <span className="h-2 w-2 rounded-full bg-accent shrink-0" />}
        </div>
        {n.body && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.body}</p>}
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
          {new Date(n.created_at).toLocaleString()}
        </p>
      </div>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDelete();
        }}
        className="h-8 w-8 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground"
        aria-label="Delete"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </>
  );

  return (
    <Wrap
      {...wrapProps}
      className={cn(
        "flex items-center gap-3 rounded-3xl border p-3 transition-colors animate-fade-up",
        n.read ? "bg-card border-border" : "bg-card border-primary/30",
      )}
    >
      {content}
    </Wrap>
  );
};

export default Notifications;
