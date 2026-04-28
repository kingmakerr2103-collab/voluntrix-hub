import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Users, ArrowLeft, CheckCircle2, XCircle, Clock as ClockIcon, Mail, Phone, MapPin } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { toUserMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type Opportunity = Database["public"]["Tables"]["opportunities"]["Row"];
type Application = Database["public"]["Tables"]["applications"]["Row"];
type AppStatus = Database["public"]["Enums"]["application_status"];

const STATUS_CLS: Record<AppStatus, string> = {
  pending: "bg-secondary/15 text-secondary",
  accepted: "bg-primary/15 text-primary",
  rejected: "bg-destructive/15 text-destructive",
  withdrawn: "bg-muted text-muted-foreground",
};

type Volunteer = { user_id: string; full_name: string | null; avatar_url: string | null; phone: string | null; location: string | null };

const MyOpportunities = () => {
  const { user } = useAuth();
  const [opps, setOpps] = useState<Opportunity[]>([]);
  const [appsByOpp, setAppsByOpp] = useState<Record<string, Application[]>>({});
  const [volunteers, setVolunteers] = useState<Record<string, Volunteer>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      const { data: oppsData, error } = await supabase
        .from("opportunities")
        .select("*")
        .eq("created_by", user.id)
        .order("created_at", { ascending: false });
      if (!active) return;
      if (error) {
        toast({ title: "Couldn't load your posts", description: toUserMessage(error), variant: "destructive" });
        setLoading(false);
        return;
      }
      const list = (oppsData ?? []) as Opportunity[];
      setOpps(list);
      if (list.length === 0) { setLoading(false); return; }
      const oppIds = list.map((o) => o.id);
      const { data: appsData } = await supabase
        .from("applications")
        .select("*")
        .in("opportunity_id", oppIds)
        .order("created_at", { ascending: false });
      const grouped: Record<string, Application[]> = {};
      (appsData ?? []).forEach((a: any) => {
        (grouped[a.opportunity_id] ??= []).push(a);
      });
      setAppsByOpp(grouped);

      const volIds = Array.from(new Set((appsData ?? []).map((a: any) => a.volunteer_id)));
      if (volIds.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url, phone, location")
          .in("user_id", volIds);
        const map: Record<string, Volunteer> = {};
        (profs ?? []).forEach((p: any) => { map[p.user_id] = p; });
        setVolunteers(map);
      }
      setLoading(false);
    })();

    const ch = supabase
      .channel("my-opps-applications")
      .on("postgres_changes", { event: "*", schema: "public", table: "applications" }, (payload) => {
        const row = (payload.new ?? payload.old) as Application;
        setAppsByOpp((prev) => {
          const next = { ...prev };
          const oid = row.opportunity_id;
          if (!next[oid] && payload.eventType !== "INSERT") return prev;
          if (payload.eventType === "INSERT") {
            next[oid] = [payload.new as Application, ...(next[oid] ?? [])];
          } else if (payload.eventType === "UPDATE") {
            next[oid] = (next[oid] ?? []).map((a) => (a.id === (payload.new as Application).id ? (payload.new as Application) : a));
          } else {
            next[oid] = (next[oid] ?? []).filter((a) => a.id !== (payload.old as Application).id);
          }
          return next;
        });
      })
      .subscribe();

    return () => { active = false; supabase.removeChannel(ch); };
  }, [user]);

  const updateStatus = async (app: Application, status: AppStatus) => {
    const { error } = await supabase.from("applications").update({ status }).eq("id", app.id);
    if (error) {
      toast({ title: "Couldn't update", description: toUserMessage(error), variant: "destructive" });
      return;
    }
    // Notify volunteer
    const opp = opps.find((o) => o.id === app.opportunity_id);
    await supabase.from("notifications").insert({
      user_id: app.volunteer_id,
      title: `Application ${status}`,
      body: opp ? `Your application to "${opp.title}" was ${status}.` : `Your application was ${status}.`,
      type: "application",
      link: "/opportunities",
    } as any);
    toast({ title: `Marked ${status}` });
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl px-5 pt-8 pb-6 space-y-5">
        <header className="flex items-center gap-3 animate-fade-up">
          <Button asChild variant="ghost" size="icon" className="rounded-full">
            <Link to="/dashboard" aria-label="Back"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Organizer</p>
            <h1 className="text-3xl font-display font-bold">My opportunities</h1>
            <p className="text-muted-foreground mt-1 text-sm">Review applicants and manage your posts.</p>
          </div>
        </header>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : opps.length === 0 ? (
          <div className="rounded-3xl bg-card border border-border p-10 text-center animate-fade-up">
            <div className="h-16 w-16 rounded-2xl bg-gradient-impact mx-auto flex items-center justify-center text-primary-foreground mb-3">
              <Users className="h-7 w-7" />
            </div>
            <h2 className="font-display text-lg font-bold">You haven't posted yet</h2>
            <p className="text-sm text-muted-foreground mt-1">Post your first opportunity from the Opportunities page.</p>
            <Button asChild variant="hero" size="sm" className="mt-4">
              <Link to="/opportunities">Go to opportunities</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {opps.map((opp) => {
              const apps = appsByOpp[opp.id] ?? [];
              const accepted = apps.filter((a) => a.status === "accepted").length;
              return (
                <article key={opp.id} className="rounded-3xl bg-card border border-border p-5 space-y-4 animate-fade-up">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {opp.status}
                      </span>
                      {opp.category && (
                        <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                          {opp.category}
                        </span>
                      )}
                    </div>
                    <h3 className="font-display font-bold">{opp.title}</h3>
                    {opp.location && (
                      <p className="text-xs text-muted-foreground inline-flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3" /> {opp.location}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {accepted}{opp.volunteers_needed != null ? ` / ${opp.volunteers_needed}` : ""} accepted · {apps.length} total
                    </p>
                  </div>

                  {apps.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">No applicants yet.</p>
                  ) : (
                    <ul className="space-y-2">
                      {apps.map((a) => {
                        const v = volunteers[a.volunteer_id];
                        return (
                          <li key={a.id} className="rounded-2xl border border-border p-3 flex items-start gap-3">
                            <div className="h-10 w-10 rounded-full bg-gradient-impact flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0">
                              {(v?.full_name ?? "?").charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-semibold text-sm">{v?.full_name ?? "Volunteer"}</p>
                                <span className={cn("text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full", STATUS_CLS[a.status])}>
                                  {a.status}
                                </span>
                              </div>
                              {v?.location && (
                                <p className="text-[11px] text-muted-foreground inline-flex items-center gap-1 mt-0.5">
                                  <MapPin className="h-3 w-3" /> {v.location}
                                </p>
                              )}
                              {a.message && <p className="text-xs text-muted-foreground mt-1.5 line-clamp-3">{a.message}</p>}
                              <div className="flex flex-wrap gap-3 mt-1.5">
                                {v?.phone && (
                                  <a href={`tel:${v.phone}`} className="text-[11px] text-primary inline-flex items-center gap-1">
                                    <Phone className="h-3 w-3" /> {v.phone}
                                  </a>
                                )}
                              </div>
                              {a.status === "pending" && (
                                <div className="flex gap-2 mt-3">
                                  <Button size="sm" variant="hero" onClick={() => updateStatus(a, "accepted")}>
                                    <CheckCircle2 className="h-4 w-4" /> Accept
                                  </Button>
                                  <Button size="sm" variant="soft" onClick={() => updateStatus(a, "rejected")}>
                                    <XCircle className="h-4 w-4" /> Reject
                                  </Button>
                                </div>
                              )}
                              {a.status === "accepted" && (
                                <Button size="sm" variant="ghost" className="mt-3" onClick={() => updateStatus(a, "rejected")}>
                                  <XCircle className="h-4 w-4" /> Revoke
                                </Button>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
};

export default MyOpportunities;
