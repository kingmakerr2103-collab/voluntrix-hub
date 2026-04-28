import { toUserMessage } from "@/lib/errors";
import { useEffect, useMemo, useState } from "react";
import { Compass, MapPin, Search, Loader2, ArrowRight, AlertTriangle, X, Mail, Phone, Users, Building2, CheckCircle2, Clock as ClockIcon, XCircle } from "lucide-react";
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
type AppStatus = Database["public"]["Enums"]["application_status"];

const URGENCY_COLOR: Record<Urgency, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-secondary/15 text-secondary",
  high: "bg-accent/15 text-accent",
  critical: "bg-destructive/15 text-destructive",
};

const CATEGORIES = ["All", "Education", "Healthcare", "Environment", "Disaster relief", "Hunger", "Animals", "Elderly", "Youth", "Community", "Other"];

const STATUS_BADGE: Record<AppStatus, { label: string; cls: string; icon: typeof CheckCircle2 }> = {
  pending: { label: "Pending", cls: "bg-secondary/15 text-secondary", icon: ClockIcon },
  accepted: { label: "Accepted", cls: "bg-primary/15 text-primary", icon: CheckCircle2 },
  rejected: { label: "Rejected", cls: "bg-destructive/15 text-destructive", icon: XCircle },
  withdrawn: { label: "Withdrawn", cls: "bg-muted text-muted-foreground", icon: XCircle },
};

type Organizer = { full_name: string | null; avatar_url: string | null };
type OrgInfo = { name: string; logo_url: string | null };

const Opportunities = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [urgency, setUrgency] = useState<Urgency | "all">("all");
  const [category, setCategory] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<"open" | "closed" | "completed" | "all">("open");
  const [selected, setSelected] = useState<Opportunity | null>(null);
  const [applying, setApplying] = useState(false);
  const [myApps, setMyApps] = useState<Record<string, AppStatus>>({});
  const [organizers, setOrganizers] = useState<Record<string, Organizer>>({});
  const [orgsById, setOrgsById] = useState<Record<string, OrgInfo>>({});

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from("opportunities")
        .select("*")
        .order("created_at", { ascending: false });
      if (!active) return;
      if (error) toast({ title: "Couldn't load opportunities", description: toUserMessage(error), variant: "destructive" });
      const list = (data ?? []) as Opportunity[];
      setItems(list);
      setLoading(false);

      // Hydrate organizer & org info
      const userIds = Array.from(new Set(list.map((o) => o.created_by).filter(Boolean)));
      const orgIds = Array.from(new Set(list.map((o) => o.organization_id).filter(Boolean) as string[]));
      if (userIds.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url")
          .in("user_id", userIds);
        const map: Record<string, Organizer> = {};
        (profs ?? []).forEach((p: any) => { map[p.user_id] = { full_name: p.full_name, avatar_url: p.avatar_url }; });
        setOrganizers(map);
      }
      if (orgIds.length) {
        const { data: orgs } = await supabase.from("organizations").select("id, name, logo_url").in("id", orgIds);
        const map: Record<string, OrgInfo> = {};
        (orgs ?? []).forEach((o: any) => { map[o.id] = { name: o.name, logo_url: o.logo_url }; });
        setOrgsById(map);
      }
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

    return () => { active = false; supabase.removeChannel(channel); };
  }, []);

  // Load this user's applications for status badges
  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("applications")
        .select("opportunity_id, status")
        .eq("volunteer_id", user.id);
      if (!active) return;
      const map: Record<string, AppStatus> = {};
      (data ?? []).forEach((a: any) => { map[a.opportunity_id] = a.status; });
      setMyApps(map);
    })();
    const ch = supabase
      .channel("my-applications-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "applications", filter: `volunteer_id=eq.${user.id}` }, (payload) => {
        setMyApps((prev) => {
          const next = { ...prev };
          if (payload.eventType === "DELETE") {
            delete next[(payload.old as any).opportunity_id];
          } else {
            const row = payload.new as any;
            next[row.opportunity_id] = row.status;
          }
          return next;
        });
      })
      .subscribe();
    return () => { active = false; supabase.removeChannel(ch); };
  }, [user]);

  const filtered = useMemo(() => {
    return items.filter((o) => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (urgency !== "all" && o.urgency !== urgency) return false;
      if (category !== "All" && (o.category ?? "").toLowerCase() !== category.toLowerCase()) return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        return (
          o.title.toLowerCase().includes(q) ||
          (o.description ?? "").toLowerCase().includes(q) ||
          (o.purpose ?? "").toLowerCase().includes(q) ||
          (o.location ?? "").toLowerCase().includes(q) ||
          (o.skills_required ?? []).some((s) => s.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [items, query, urgency, category, statusFilter]);

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
      toast({ title: "Couldn't apply", description: toUserMessage(error), variant: "destructive" });
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
        <div className="relative animate-fade-up">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search needs, skills, places…"
            className="w-full bg-card border border-border rounded-full pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Status (live) chips */}
        <FilterRow label="Status">
          {(["open", "closed", "completed", "all"] as const).map((s) => (
            <Chip key={s} active={statusFilter === s} onClick={() => setStatusFilter(s)}>
              {s === "open" ? "Upcoming" : s === "closed" ? "Ongoing" : s === "completed" ? "Completed" : "All"}
            </Chip>
          ))}
        </FilterRow>

        {/* Urgency chips */}
        <FilterRow label="Urgency">
          {(["all", "critical", "high", "medium", "low"] as const).map((u) => (
            <Chip key={u} active={urgency === u} onClick={() => setUrgency(u)}>
              {u === "all" ? "Any" : u.charAt(0).toUpperCase() + u.slice(1)}
            </Chip>
          ))}
        </FilterRow>

        {/* Categories */}
        <FilterRow label="Category">
          {CATEGORIES.map((c) => (
            <Chip key={c} active={category === c} onClick={() => setCategory(c)}>{c}</Chip>
          ))}
        </FilterRow>

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
              <OpportunityCard
                key={o.id}
                opportunity={o}
                organizer={organizers[o.created_by]}
                org={o.organization_id ? orgsById[o.organization_id] : undefined}
                appStatus={myApps[o.id]}
                onClick={() => setSelected(o)}
              />
            ))}
          </div>
        )}
      </div>

      {selected && (
        <OpportunityDetail
          opportunity={selected}
          organizer={organizers[selected.created_by]}
          org={selected.organization_id ? orgsById[selected.organization_id] : undefined}
          appStatus={myApps[selected.id]}
          onClose={() => setSelected(null)}
          onApply={apply}
          applying={applying}
        />
      )}
    </AppShell>
  );
};

const FilterRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5 animate-fade-up">
    <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold px-1">{label}</p>
    <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1">{children}</div>
  </div>
);

const Chip = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button
    onClick={onClick}
    className={cn(
      "px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-colors",
      active ? "bg-foreground text-background border-foreground" : "bg-card border-border text-muted-foreground hover:text-foreground",
    )}
  >
    {children}
  </button>
);

const OrganizerLine = ({ organizer, org }: { organizer?: Organizer; org?: OrgInfo }) => {
  if (org) return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
      <Building2 className="h-3 w-3" /> {org.name}
    </span>
  );
  if (organizer?.full_name) return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
      by <span className="font-semibold text-foreground">{organizer.full_name}</span>
    </span>
  );
  return null;
};

const StatusPill = ({ status }: { status?: AppStatus }) => {
  if (!status) return null;
  const meta = STATUS_BADGE[status];
  const Icon = meta.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full", meta.cls)}>
      <Icon className="h-3 w-3" /> {meta.label}
    </span>
  );
};

const OpportunityCard = ({
  opportunity,
  organizer,
  org,
  appStatus,
  onClick,
}: {
  opportunity: Opportunity;
  organizer?: Organizer;
  org?: OrgInfo;
  appStatus?: AppStatus;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className="w-full text-left rounded-3xl bg-card border border-border p-4 hover:shadow-md transition-shadow animate-fade-up"
  >
    <div className="flex items-start gap-3">
      <div className="h-12 w-12 rounded-2xl bg-gradient-impact shrink-0 flex items-center justify-center text-primary-foreground text-xl">
        {emojiFor(opportunity.category)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className={cn("text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full", URGENCY_COLOR[opportunity.urgency])}>
            {opportunity.urgency === "critical" && <AlertTriangle className="inline h-3 w-3 mr-0.5" />}
            {opportunity.urgency}
          </span>
          {opportunity.category && (
            <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              {opportunity.category}
            </span>
          )}
          <StatusPill status={appStatus} />
        </div>
        <h3 className="font-semibold text-sm">{opportunity.title}</h3>
        {opportunity.purpose && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{opportunity.purpose}</p>
        )}
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          <OrganizerLine organizer={organizer} org={org} />
          {opportunity.location && (
            <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {opportunity.location}
            </span>
          )}
          {opportunity.volunteers_needed != null && (
            <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
              <Users className="h-3 w-3" /> {opportunity.volunteers_needed} needed
            </span>
          )}
        </div>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground self-center" />
    </div>
  </button>
);

const OpportunityDetail = ({
  opportunity,
  organizer,
  org,
  appStatus,
  onClose,
  onApply,
  applying,
}: {
  opportunity: Opportunity;
  organizer?: Organizer;
  org?: OrgInfo;
  appStatus?: AppStatus;
  onClose: () => void;
  onApply: (o: Opportunity, msg: string) => void;
  applying: boolean;
}) => {
  const [message, setMessage] = useState("");
  const alreadyApplied = !!appStatus;
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
          <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-white/20">
            {opportunity.urgency} · {opportunity.category ?? "General"}
          </span>
          <h2 className="font-display text-2xl font-bold mt-2">{opportunity.title}</h2>
          {(org || organizer?.full_name) && (
            <p className="text-sm text-white/85 mt-1 inline-flex items-center gap-1.5">
              <Building2 className="h-4 w-4" /> {org?.name ?? `Posted by ${organizer?.full_name}`}
            </p>
          )}
          {opportunity.location && (
            <p className="text-sm text-white/80 inline-flex items-center gap-1 mt-1">
              <MapPin className="h-4 w-4" /> {opportunity.location}
            </p>
          )}
        </div>
        <div className="p-6 space-y-5">
          {appStatus && (
            <div className="rounded-2xl bg-muted p-3 flex items-center gap-2">
              <span className="text-xs font-semibold">Your application:</span>
              <StatusPill status={appStatus} />
            </div>
          )}

          {opportunity.purpose && (
            <div>
              <h3 className="font-semibold text-sm mb-1">Purpose</h3>
              <p className="text-sm text-muted-foreground">{opportunity.purpose}</p>
            </div>
          )}

          {opportunity.description && (
            <div>
              <h3 className="font-semibold text-sm mb-1">Details</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-line">{opportunity.description}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 text-sm">
            {opportunity.volunteers_needed != null && (
              <InfoTile icon={Users} label="Volunteers needed" value={String(opportunity.volunteers_needed)} />
            )}
            <InfoTile icon={AlertTriangle} label="Urgency" value={opportunity.urgency} />
          </div>

          {opportunity.skills_required.length > 0 && (
            <div>
              <h3 className="font-semibold text-sm mb-2">Skills</h3>
              <div className="flex flex-wrap gap-1.5">
                {opportunity.skills_required.map((s) => (
                  <span key={s} className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold border border-primary/15">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {(opportunity.contact_email || opportunity.contact_phone) && (
            <div>
              <h3 className="font-semibold text-sm mb-2">Contact organizer</h3>
              <div className="space-y-1.5">
                {opportunity.contact_email && (
                  <a href={`mailto:${opportunity.contact_email}`} className="flex items-center gap-2 text-sm text-primary hover:underline">
                    <Mail className="h-4 w-4" /> {opportunity.contact_email}
                  </a>
                )}
                {opportunity.contact_phone && (
                  <a href={`tel:${opportunity.contact_phone}`} className="flex items-center gap-2 text-sm text-primary hover:underline">
                    <Phone className="h-4 w-4" /> {opportunity.contact_phone}
                  </a>
                )}
              </div>
            </div>
          )}

          {!alreadyApplied && (
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
          )}

          <Button
            variant="hero"
            size="lg"
            className="w-full"
            onClick={() => onApply(opportunity, message)}
            disabled={applying || alreadyApplied}
          >
            {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : alreadyApplied ? "Already applied" : "Apply now"}
          </Button>
        </div>
      </div>
    </div>
  );
};

const InfoTile = ({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) => (
  <div className="rounded-2xl bg-muted p-3">
    <div className="flex items-center gap-2 text-muted-foreground text-[10px] uppercase font-bold tracking-wider">
      <Icon className="h-3.5 w-3.5" /> {label}
    </div>
    <div className="font-semibold text-sm mt-1 capitalize">{value}</div>
  </div>
);

const EmptyState = () => (
  <div className="rounded-3xl bg-card border border-border p-10 text-center animate-fade-up">
    <div className="h-16 w-16 rounded-2xl bg-gradient-impact mx-auto flex items-center justify-center text-primary-foreground mb-3">
      <Compass className="h-7 w-7" />
    </div>
    <h2 className="font-display text-lg font-bold">No opportunities yet</h2>
    <p className="text-sm text-muted-foreground mt-1">Be the first to post or check back soon.</p>
  </div>
);

const emojiFor = (category: string | null) => {
  const c = (category ?? "").toLowerCase();
  if (c.includes("food") || c.includes("hunger")) return "🍲";
  if (c.includes("teach") || c.includes("edu")) return "📚";
  if (c.includes("garden") || c.includes("env")) return "🌱";
  if (c.includes("health")) return "🩺";
  if (c.includes("animal")) return "🐾";
  if (c.includes("disaster") || c.includes("relief")) return "🚨";
  if (c.includes("eld")) return "🧓";
  if (c.includes("youth")) return "🧒";
  return "🤝";
};

export default Opportunities;
