import { toUserMessage } from "@/lib/errors";
import { useEffect, useMemo, useState } from "react";
import { Loader2, MapPin, AlertTriangle, Layers } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { LeafletMap, type MapPin as MapPinType } from "@/components/LeafletMap";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { UseMyLocationButton } from "@/components/UseMyLocationButton";
import type { Database } from "@/integrations/supabase/types";

type Opportunity = Database["public"]["Tables"]["opportunities"]["Row"];
type Urgency = Database["public"]["Enums"]["urgency_level"];

const URGENCY_RING: Record<Urgency, string> = {
  critical: "bg-destructive",
  high: "bg-accent",
  medium: "bg-secondary",
  low: "bg-primary",
};

const MapView = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Urgency | "all">("all");
  const [selected, setSelected] = useState<Opportunity | null>(null);
  const [userLoc, setUserLoc] = useState<{ lat: number; lon: number } | null>(null);

  useEffect(() => {
    (async () => {
      const oppsP = supabase
        .from("opportunities")
        .select("*")
        .eq("status", "open")
        .order("created_at", { ascending: false });
      const profileP = user
        ? supabase.from("profiles").select("latitude, longitude").eq("user_id", user.id).maybeSingle()
        : Promise.resolve({ data: null, error: null } as { data: null; error: null });
      const [{ data, error }, profileRes] = await Promise.all([oppsP, profileP]);
      if (error)
        toast({ title: "Couldn't load map", description: toUserMessage(error), variant: "destructive" });
      setItems((data ?? []) as Opportunity[]);
      const p = (profileRes as { data: { latitude: number | null; longitude: number | null } | null }).data;
      if (p?.latitude != null && p?.longitude != null) {
        setUserLoc({ lat: p.latitude, lon: p.longitude });
      }
      setLoading(false);
    })();
  }, [user]);

  const saveLocation = async (lat: number, lon: number, address: string | null) => {
    setUserLoc({ lat, lon });
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .update({ latitude: lat, longitude: lon, location: address ?? undefined })
      .eq("user_id", user.id);
    if (error) toast({ title: "Couldn't save location", description: toUserMessage(error), variant: "destructive" });
  };

  const filtered = useMemo(
    () => (filter === "all" ? items : items.filter((o) => o.urgency === filter)),
    [items, filter],
  );

  const pins: MapPinType[] = useMemo(
    () =>
      filtered
        .filter((o) => o.latitude != null && o.longitude != null)
        .map((o) => ({
          id: o.id,
          lat: o.latitude as number,
          lon: o.longitude as number,
          title: o.title,
          subtitle: o.location ?? undefined,
          urgency: o.urgency,
          onClick: () => setSelected(o),
        })),
    [filtered],
  );

  const withoutCoords = filtered.length - pins.length;

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl px-5 pt-8 pb-6 space-y-5">
        <header className="flex items-end justify-between animate-fade-up">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
              Explore
            </p>
            <h1 className="text-3xl font-display font-bold">Map of impact</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Live needs around your community.
            </p>
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
                filter === u
                  ? "bg-foreground text-background border-foreground"
                  : "bg-card border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {u === "all" ? "All" : u.charAt(0).toUpperCase() + u.slice(1)}
            </button>
          ))}
        </div>

        {/* Real Leaflet map */}
        <div className="relative rounded-3xl overflow-hidden border border-border shadow-md aspect-[4/5] bg-muted animate-fade-up">
          {loading && (
            <div className="absolute inset-0 z-[400] flex items-center justify-center bg-card/60">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}
          <LeafletMap pins={pins} />

          {!loading && pins.length === 0 && (
            <div className="absolute inset-0 z-[400] flex flex-col items-center justify-center text-center px-6 bg-card/85 backdrop-blur-sm">
              <MapPin className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm font-semibold">No mapped opportunities yet</p>
              <p className="text-xs text-muted-foreground">
                {withoutCoords > 0
                  ? `${withoutCoords} opportunity(ies) have no coordinates set.`
                  : "New geo-located needs will appear here."}
              </p>
            </div>
          )}

          {/* Legend */}
          <div className="absolute z-[450] bottom-3 left-3 right-3 flex items-center justify-between rounded-2xl bg-card/95 backdrop-blur border border-border px-3 py-2 pointer-events-none">
            <div className="flex items-center gap-3 text-[10px] font-semibold">
              <Legend color="bg-destructive" label="Critical" />
              <Legend color="bg-accent" label="High" />
              <Legend color="bg-secondary" label="Medium" />
              <Legend color="bg-primary" label="Low" />
            </div>
            <span className="text-[10px] text-muted-foreground">{pins.length} pins</span>
          </div>
        </div>

        {/* Selected detail */}
        {selected && (
          <article className="rounded-3xl bg-card border border-border p-5 animate-fade-up">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn("h-2 w-2 rounded-full", URGENCY_RING[selected.urgency])} />
                  <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                    {selected.urgency}
                  </span>
                </div>
                <h3 className="font-display font-bold text-lg">{selected.title}</h3>
                {selected.location && (
                  <p className="text-xs text-muted-foreground inline-flex items-center gap-1 mt-1">
                    <MapPin className="h-3 w-3" /> {selected.location}
                  </p>
                )}
                {selected.latitude != null && selected.longitude != null && (
                  <p className="text-[10px] text-muted-foreground mt-1 font-mono">
                    {selected.latitude.toFixed(5)}, {selected.longitude.toFixed(5)}
                  </p>
                )}
                {selected.description && (
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-3">
                    {selected.description}
                  </p>
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
