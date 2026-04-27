import { useEffect, useMemo, useState } from "react";
import { Compass, MapPin, Search, Filter, Loader2, ArrowRight, AlertTriangle, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { CreateOpportunityDialog } from "@/components/CreateOpportunityDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type Opportunity = Database["public"]["Tables"]["opportunities"]["Row"];
type Urgency = Database["public"]["Enums"]["urgency_level"];

const URGENCY_COLOR: Record<Urgency, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-secondary/15 text-secondary",
  high: "bg-accent/15 text-accent",
  critical: "bg-destructive/15 text-destructive",
};

const Opportunities = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [urgency, setUrgency] = useState<Urgency | "all">("all");
  const [selected, setSelected] = useState<Opportunity | null>(null);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from("opportunities")
        .select("*")
        .eq("status", "open")
        .order("created_at", { ascending: false });
      if (!active) return;
      if (error) toast({ title: "Couldn't load opportunities", description: error.message, variant: "destructive" });
      setItems((data ?? []) as Opportunity[]);
      setLoading(false);
    })();

    const channel = supabase
      .channel("opportunities-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "opportunities" }, (payload) => {
        setItems((prev) => {
          if (payload.eventType === "INSERT") return [payload.new as Opportunity, ...prev];
          if (payload.eventType === "UPDATE")
            return prev.map((o) => (o.id === (payload.new as Opportunity).id ? (payload.new as Opportunity) : o));
          if (payload.eventType === "DELETE") return prev.filter((o) => o.id !== (payload.old as Opportunity).id);
          return prev;
        });
      })
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const filtered = useMemo(() => {
    return items.filter((o) => {
      if (urgency !== "all" && o.urgency !== urgency) return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        return (
          o.title.toLowerCase().includes(q) ||
          (o.description ?? "").toLowerCase().includes(q) ||
          (o.location ?? "").toLowerCase().includes(q) ||
          (o.skills_required ?? []).some((s) => s.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [items, query, urgency]);

  const apply = async (opp: Opportunity, message: string) => {
    if (!user) return;
    setApplying(true);
    const { error } = await supabase.from("applications").insert({
      opportunity_id: opp.id,
      volunteer_id: user.id,
      message: message || null,
    });
    setApplying(false);
    if (error) {
      toast({ title: "Couldn't apply", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Application sent", description: `You applied to "${opp.title}".` });
    setSelected(null);
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl px-5 pt-8 pb-6 space-y-5">
        <header className="flex items-end justify-between gap-3 animate-fade-up">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Discover</p>
            <h1 className="text-3xl font-display font-bold">Opportunities</h1>
            <p className="text-muted-foreground mt-1 text-sm">Find a way to help that matches your skills.</p>
          </div>
          <CreateOpportunityDialog />
        </header>

        {/* Search */}
        <div className="flex gap-2 animate-fade-up">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search needs, skills, places…"
              className="w-full bg-card border border-border rounded-full pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <Button variant="soft" size="icon" className="rounded-full h-12 w-12">
            <Filter className="h-4 w-4" />
          </Button>
        </div>

        {/* Urgency chips */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1 animate-fade-up">
          {(["all", "critical", "high", "medium", "low"] as const).map((u) => (
            <button
              key={u}
              onClick={() => setUrgency(u)}
              className={cn(
                "px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-colors",
                urgency === u ? "bg-foreground text-background border-foreground" : "bg-card border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {u === "all" ? "All" : u.charAt(0).toUpperCase() + u.slice(1)}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-3">
            {filtered.map((o) => (
              <OpportunityCard key={o.id} opportunity={o} onClick={() => setSelected(o)} />
            ))}
          </div>
        )}
      </div>

      {selected && (
        <OpportunityDetail
          opportunity={selected}
          onClose={() => setSelected(null)}
          onApply={apply}
          applying={applying}
        />
      )}
    </AppShell>
  );
};

const OpportunityCard = ({ opportunity, onClick }: { opportunity: Opportunity; onClick: () => void }) => (
  <button
    onClick={onClick}
    className="w-full text-left rounded-3xl bg-card border border-border p-4 hover:shadow-md transition-shadow animate-fade-up"
  >
    <div className="flex items-start gap-3">
      <div className="h-12 w-12 rounded-2xl bg-gradient-impact shrink-0 flex items-center justify-center text-primary-foreground text-xl">
        {emojiFor(opportunity.category)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span
            className={cn(
              "text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full",
              URGENCY_COLOR[opportunity.urgency],
            )}
          >
            {opportunity.urgency === "critical" && <AlertTriangle className="inline h-3 w-3 mr-0.5" />}
            {opportunity.urgency}
          </span>
          {opportunity.location && (
            <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {opportunity.location}
            </span>
          )}
        </div>
        <h3 className="font-semibold text-sm">{opportunity.title}</h3>
        {opportunity.description && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{opportunity.description}</p>
        )}
        {opportunity.skills_required.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {opportunity.skills_required.slice(0, 4).map((s) => (
              <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                {s}
              </span>
            ))}
          </div>
        )}
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground self-center" />
    </div>
  </button>
);

const OpportunityDetail = ({
  opportunity,
  onClose,
  onApply,
  applying,
}: {
  opportunity: Opportunity;
  onClose: () => void;
  onApply: (o: Opportunity, msg: string) => void;
  applying: boolean;
}) => {
  const [message, setMessage] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-foreground/40 backdrop-blur-sm animate-fade-up" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-card rounded-t-3xl sm:rounded-3xl border border-border max-h-[90vh] overflow-y-auto animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-hero p-6 text-white relative">
          <button onClick={onClose} className="absolute top-4 right-4 h-9 w-9 rounded-full bg-white/20 backdrop-blur flex items-center justify-center" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
          <span className={cn("text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-white/20")}>
            {opportunity.urgency}
          </span>
          <h2 className="font-display text-2xl font-bold mt-2">{opportunity.title}</h2>
          {opportunity.location && (
            <p className="text-sm text-white/80 inline-flex items-center gap-1 mt-1">
              <MapPin className="h-4 w-4" /> {opportunity.location}
            </p>
          )}
        </div>
        <div className="p-6 space-y-5">
          {opportunity.description && (
            <div>
              <h3 className="font-semibold text-sm mb-1">About</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-line">{opportunity.description}</p>
            </div>
          )}
          {opportunity.skills_required.length > 0 && (
            <div>
              <h3 className="font-semibold text-sm mb-2">Skills needed</h3>
              <div className="flex flex-wrap gap-1.5">
                {opportunity.skills_required.map((s) => (
                  <span key={s} className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold border border-primary/15">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div>
            <h3 className="font-semibold text-sm mb-2">Message to organizer (optional)</h3>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder="Tell them why you'd be a great fit…"
              className="w-full bg-muted rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <Button variant="hero" size="lg" className="w-full" onClick={() => onApply(opportunity, message)} disabled={applying}>
            {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply now"}
          </Button>
        </div>
      </div>
    </div>
  );
};

const EmptyState = () => (
  <div className="rounded-3xl bg-card border border-border p-10 text-center animate-fade-up">
    <div className="h-16 w-16 rounded-2xl bg-gradient-impact mx-auto flex items-center justify-center text-primary-foreground mb-3">
      <Compass className="h-7 w-7" />
    </div>
    <h2 className="font-display text-lg font-bold">No opportunities yet</h2>
    <p className="text-sm text-muted-foreground mt-1">Be the first to know when new needs appear nearby.</p>
  </div>
);

const emojiFor = (category: string | null) => {
  const c = (category ?? "").toLowerCase();
  if (c.includes("food")) return "🍲";
  if (c.includes("teach") || c.includes("edu")) return "📚";
  if (c.includes("garden") || c.includes("env")) return "🌱";
  if (c.includes("health")) return "🩺";
  if (c.includes("animal")) return "🐾";
  if (c.includes("disaster") || c.includes("relief")) return "🚨";
  return "🤝";
};

export default Opportunities;
