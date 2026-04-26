import { useEffect, useMemo, useState } from "react";
import { Loader2, MapPin, AlertTriangle, Layers } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type Opportunity = Database["public"]["Tables"]["opportunities"]["Row"];
type Urgency = Database["public"]["Enums"]["urgency_level"];

const URGENCY_RING: Record<Urgency, string> = {
  critical: "bg-destructive shadow-[0_0_0_6px_hsl(var(--destructive)/0.25)]",
  high: "bg-accent shadow-[0_0_0_6px_hsl(var(--accent)/0.25)]",
  medium: "bg-secondary shadow-[0_0_0_6px_hsl(var(--secondary)/0.25)]",
  low: "bg-primary shadow-[0_0_0_6px_hsl(var(--primary)/0.2)]",
};

const MapView = () => {
  const [items, setItems] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Urgency | "all">("all");
  const [selected, setSelected] = useState<Opportunity | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("opportunities")
        .select("*")
        .eq("status", "open")
        .order("created_at", { ascending: false });
      if (error) toast({ title: "Couldn't load map", description: error.message, variant: "destructive" });
      setItems((data ?? []) as Opportunity[]);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => (filter === "all" ? items : items.filter((o) => o.urgency === filter)), [items, filter]);

  // Project lat/lng to a virtual "city grid". Items without coords get a deterministic spot.
  const points = useMemo(() => {
    return filtered.map((o, i) => {
      let x: number, y: number;
      if (o.latitude != null && o.longitude != null) {
        // Map roughly to 0-100% range using fractional parts
        x = ((((o.longitude % 1) + 1) % 1) * 100);
        y = ((((o.latitude % 1) + 1) % 1) * 100);
      } else {
        // Hash from id
        const h = [...o.id].reduce((acc, c) => acc + c.charCodeAt(0), 0);
        x = (h * 37) % 90 + 5;
        y = (h * 17) % 80 + 10;
      }
      return { o, x, y, i };
    });
  }, [filtered]);

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl px-5 pt-8 pb-6 space-y-5">
        <header className="flex items-end justify-between animate-fade-up">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Explore</p>
            <h1 className="text-3xl font-display font-bold">Map of impact</h1>
            <p className="text-muted-foreground mt-1 text-sm">Live needs around your community.</p>
          </div>
          <Button variant="soft" size="icon" className="rounded-full">
            <Layers className="h-4 w-4" />
          </Button>
        </header>

        <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1 animate-fade-up">
          {(["all", "critical", "high", "medium", "low"] as const).map((u) => (
            <button
              key={u}
              onClick={() => setFilter(u)}
              className={cn(
                "px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-colors",
                filter === u ? "bg-foreground text-background border-foreground" : "bg-card border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {u === "all" ? "All" : u.charAt(0).toUpperCase() + u.slice(1)}
            </button>
          ))}
        </div>

        {/* Map canvas */}
        <div className="relative rounded-3xl overflow-hidden border border-border shadow-md aspect-[4/5] bg-gradient-mesh animate-fade-up">
          {/* Decorative grid */}
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                "linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          />
          {/* Decorative blobs */}
          <div className="absolute -left-12 top-12 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute right-0 bottom-0 h-56 w-56 rounded-full bg-accent/10 blur-3xl" />

          {loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}

          {!loading && points.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
              <MapPin className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm font-semibold">No active needs to show</p>
              <p className="text-xs text-muted-foreground">New opportunities will appear here in real time.</p>
            </div>
          )}

          {points.map(({ o, x, y }) => (
            <button
              key={o.id}
              onClick={() => setSelected(o)}
              className="absolute -translate-x-1/2 -translate-y-1/2 group"
              style={{ left: `${x}%`, top: `${y}%` }}
              aria-label={o.title}
            >
              {o.urgency === "critical" && (
                <span className="absolute inset-0 rounded-full bg-destructive/40 animate-pulse-ring" aria-hidden />
              )}
              <span className={cn("relative block h-4 w-4 rounded-full border-2 border-background", URGENCY_RING[o.urgency])} />
              <span className="absolute left-1/2 -translate-x-1/2 top-5 px-2 py-0.5 rounded-full bg-card text-[10px] font-semibold whitespace-nowrap shadow-sm border border-border opacity-0 group-hover:opacity-100 transition-opacity">
                {o.title}
              </span>
            </button>
          ))}

          {/* Legend */}
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between rounded-2xl bg-card/90 backdrop-blur border border-border px-3 py-2">
            <div className="flex items-center gap-3 text-[10px] font-semibold">
              <Legend color="bg-destructive" label="Critical" />
              <Legend color="bg-accent" label="High" />
              <Legend color="bg-secondary" label="Medium" />
              <Legend color="bg-primary" label="Low" />
            </div>
            <span className="text-[10px] text-muted-foreground">{points.length} pins</span>
          </div>
        </div>

        {/* Selected detail */}
        {selected && (
          <article className="rounded-3xl bg-card border border-border p-5 animate-fade-up">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn("h-2 w-2 rounded-full", URGENCY_RING[selected.urgency])} />
                  <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">{selected.urgency}</span>
                </div>
                <h3 className="font-display font-bold text-lg">{selected.title}</h3>
                {selected.location && (
                  <p className="text-xs text-muted-foreground inline-flex items-center gap-1 mt-1">
                    <MapPin className="h-3 w-3" /> {selected.location}
                  </p>
                )}
                {selected.description && (
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{selected.description}</p>
                )}
              </div>
              {selected.urgency === "critical" && (
                <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-destructive/15 text-destructive">
                  <AlertTriangle className="h-3 w-3" /> Urgent
                </span>
              )}
            </div>
          </article>
        )}
      </div>
    </AppShell>
  );
};

const Legend = ({ color, label }: { color: string; label: string }) => (
  <span className="inline-flex items-center gap-1.5">
    <span className={cn("h-2 w-2 rounded-full", color)} /> {label}
  </span>
);

export default MapView;
