import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bell, Search, AlertTriangle, MapPin, Sparkles, ArrowRight, TrendingUp, Heart, Calendar, Users, Loader2,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import bannerImg from "@/assets/dashboard-banner.jpg";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { UseMyLocationButton } from "@/components/UseMyLocationButton";
import { toUserMessage } from "@/lib/errors";
import { toast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type Opportunity = Database["public"]["Tables"]["opportunities"]["Row"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];

const DAY_FORMAT: Intl.DateTimeFormatOptions = { weekday: "long", month: "short", day: "numeric" };

const haversineKm = (a: { lat: number; lon: number }, b: { lat: number; lon: number }) => {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

const Dashboard = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [stats, setStats] = useState({ applications: 0, accepted: 0, projects: 0, teammates: 0 });
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const [profileRes, oppsRes, appsRes, projectsRes, notifsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
        supabase
          .from("opportunities")
          .select("*")
          .eq("status", "open")
          .order("created_at", { ascending: false })
          .limit(50),
        supabase.from("applications").select("status").eq("volunteer_id", user.id),
        supabase
          .from("project_members")
          .select("project_id, projects:project_id(id, organization_id)")
          .eq("user_id", user.id),
        supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("read", false),
      ]);

      if (cancelled) return;

      if (profileRes.error) toast({ title: "Couldn't load profile", description: toUserMessage(profileRes.error), variant: "destructive" });
      setProfile((profileRes.data as Profile | null) ?? null);

      if (oppsRes.error) toast({ title: "Couldn't load opportunities", description: toUserMessage(oppsRes.error), variant: "destructive" });
      setOpportunities((oppsRes.data ?? []) as Opportunity[]);

      const apps = appsRes.data ?? [];
      const accepted = apps.filter((a) => a.status === "accepted").length;

      // Teammates: distinct co-members across the user's projects (excluding self).
      let teammates = 0;
      const projectIds = (projectsRes.data ?? []).map((r: { project_id: string }) => r.project_id);
      if (projectIds.length > 0) {
        const { data: coMembers } = await supabase
          .from("project_members")
          .select("user_id")
          .in("project_id", projectIds);
        const set = new Set<string>();
        (coMembers ?? []).forEach((m: { user_id: string }) => {
          if (m.user_id !== user.id) set.add(m.user_id);
        });
        teammates = set.size;
      }

      setStats({
        applications: apps.length,
        accepted,
        projects: projectIds.length,
        teammates,
      });

      setUnreadCount(notifsRes.count ?? 0);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const displayName = useMemo(() => {
    const full = profile?.full_name?.trim();
    if (full) return full.split(/\s+/)[0];
    const meta = (user?.user_metadata ?? {}) as { full_name?: string; name?: string };
    const metaName = (meta.full_name ?? meta.name ?? "").trim();
    if (metaName) return metaName.split(/\s+/)[0];
    if (user?.email) return user.email.split("@")[0];
    return "friend";
  }, [profile, user]);

  const userCoords = useMemo(
    () =>
      profile?.latitude != null && profile?.longitude != null
        ? { lat: profile.latitude, lon: profile.longitude }
        : null,
    [profile],
  );

  const decoratedOpps = useMemo(() => {
    return opportunities.map((o) => {
      const hasCoords = o.latitude != null && o.longitude != null;
      const distanceKm =
        hasCoords && userCoords
          ? haversineKm(userCoords, { lat: o.latitude as number, lon: o.longitude as number })
          : null;
      const userSkills = (profile?.skills ?? []) as string[];
      const overlap = userSkills.filter((s) =>
        (o.skills_required ?? []).map((r) => r.toLowerCase()).includes(s.toLowerCase()),
      ).length;
      const matchPct = userSkills.length > 0 && (o.skills_required?.length ?? 0) > 0
        ? Math.round((overlap / Math.max(userSkills.length, o.skills_required.length)) * 100)
        : null;
      return { opp: o, distanceKm, matchPct };
    });
  }, [opportunities, userCoords, profile]);

  const urgentAlert = useMemo(() => {
    const candidates = decoratedOpps.filter(({ opp }) => opp.urgency === "critical" || opp.urgency === "high");
    if (candidates.length === 0) return null;
    candidates.sort((a, b) => {
      const ua = a.opp.urgency === "critical" ? 0 : 1;
      const ub = b.opp.urgency === "critical" ? 0 : 1;
      if (ua !== ub) return ua - ub;
      const da = a.distanceKm ?? Number.POSITIVE_INFINITY;
      const db = b.distanceKm ?? Number.POSITIVE_INFINITY;
      return da - db;
    });
    return candidates[0];
  }, [decoratedOpps]);

  const recommendations = useMemo(() => {
    const sorted = [...decoratedOpps].sort((a, b) => {
      const ma = a.matchPct ?? -1;
      const mb = b.matchPct ?? -1;
      if (mb !== ma) return mb - ma;
      const da = a.distanceKm ?? Number.POSITIVE_INFINITY;
      const db = b.distanceKm ?? Number.POSITIVE_INFINITY;
      return da - db;
    });
    return sorted.slice(0, 3);
  }, [decoratedOpps]);

  const totalNeeds = opportunities.length;
  const today = new Date().toLocaleDateString(undefined, DAY_FORMAT);

  const saveLocation = async (lat: number, lon: number, address: string | null) => {
    if (!user) return;
    const { error, data } = await supabase
      .from("profiles")
      .update({ latitude: lat, longitude: lon, location: address ?? profile?.location ?? null })
      .eq("user_id", user.id)
      .select()
      .maybeSingle();
    if (error) {
      toast({ title: "Couldn't save location", description: toUserMessage(error), variant: "destructive" });
      return;
    }
    setProfile(data as Profile);
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl px-5 pt-8 pb-6 space-y-7">
        {/* Header */}
        <header className="flex items-center justify-between animate-fade-up">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">{today}</p>
            <h1 className="text-2xl font-display font-bold mt-0.5 truncate">Hey {displayName} 👋</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="icon" className="rounded-full">
              <Link to="/opportunities" aria-label="Search opportunities">
                <Search className="h-5 w-5" />
              </Link>
            </Button>
            <Link to="/notifications" className="relative h-11 w-11 inline-flex items-center justify-center rounded-full hover:bg-muted">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-accent ring-2 ring-background" />
              )}
            </Link>
          </div>
        </header>

        {/* Location chip */}
        <div className="flex items-center gap-2 flex-wrap animate-fade-up">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted text-xs font-medium">
            <MapPin className="h-3.5 w-3.5 text-primary" />
            {profile?.location ?? "No location set"}
          </span>
          <UseMyLocationButton
            size="sm"
            variant="ghost"
            label={userCoords ? "Update" : "Set current location"}
            onLocate={(loc) => saveLocation(loc.latitude, loc.longitude, loc.address)}
          />
        </div>

        {/* Urgent alert */}
        {loading ? (
          <SkeletonCard />
        ) : urgentAlert ? (
          <Link
            to="/opportunities"
            className="block rounded-3xl bg-gradient-energy p-[1.5px] shadow-glow-cta animate-fade-up"
          >
            <div className="rounded-[calc(1.5rem-2px)] bg-card px-5 py-4 flex items-center gap-4">
              <div className="h-11 w-11 rounded-2xl bg-gradient-energy flex items-center justify-center text-white shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-accent">
                    {urgentAlert.opp.urgency === "critical" ? "Critical" : "Urgent"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {urgentAlert.distanceKm != null
                      ? `${urgentAlert.distanceKm.toFixed(1)} km away`
                      : urgentAlert.opp.location ?? "Location TBD"}
                  </span>
                </div>
                <p className="font-semibold text-sm truncate">{urgentAlert.opp.title}</p>
              </div>
              <Button size="sm" variant="hero">Help</Button>
            </div>
          </Link>
        ) : (
          <div className="rounded-3xl bg-card border border-dashed border-border px-5 py-4 text-center text-sm text-muted-foreground animate-fade-up">
            No urgent needs right now — explore matched opportunities below.
          </div>
        )}

        {/* Stats grid */}
        <section className="grid grid-cols-2 gap-3 animate-fade-up">
          <StatCard
            icon={Heart}
            label="Applications"
            value={String(stats.applications)}
            delta={`${stats.accepted} accepted`}
            tone="impact"
          />
          <StatCard
            icon={TrendingUp}
            label="Open near you"
            value={String(totalNeeds)}
            delta={userCoords ? "personalized" : "set location"}
            tone="trust"
          />
          <StatCard
            icon={Calendar}
            label="Projects"
            value={String(stats.projects)}
            delta={stats.projects > 0 ? "active" : "join one"}
            tone="cta"
          />
          <StatCard
            icon={Users}
            label="Team mates"
            value={String(stats.teammates)}
            delta={stats.teammates > 0 ? "across projects" : "—"}
            tone="impact"
          />
        </section>

        {/* Organizer shortcut */}
        <Link
          to="/my-opportunities"
          className="flex items-center justify-between rounded-3xl bg-card border border-border px-5 py-4 hover:shadow-md transition-shadow animate-fade-up"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-trust flex items-center justify-center text-white">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-sm">Manage your posts</p>
              <p className="text-xs text-muted-foreground">Review applicants & approve volunteers</p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </Link>

        {/* Map preview */}
        <section className="animate-fade-up">
          <SectionHeader title="Needs near you" to="/map" />
          <Link to="/map" className="block relative rounded-3xl overflow-hidden shadow-md border border-border group">
            <img src={bannerImg} alt="Map preview" width={1280} height={640} loading="lazy" className="w-full h-44 object-cover transition-transform group-hover:scale-105 duration-500" />
            <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-transparent to-transparent" />
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4" />
                <span className="font-medium">{totalNeeds} active needs nearby</span>
              </div>
              <Button size="sm" variant="glass">Open map</Button>
            </div>
          </Link>
        </section>

        {/* Recommended */}
        <section className="animate-fade-up">
          <SectionHeader title="Matched for your skills" to="/opportunities" badge="AI" />
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : recommendations.length === 0 ? (
            <div className="rounded-3xl bg-card border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No matches yet. Add skills to your profile to unlock smart matches.
            </div>
          ) : (
            <div className="space-y-3">
              {recommendations.map(({ opp, matchPct, distanceKm }) => (
                <Link
                  key={opp.id}
                  to="/opportunities"
                  className="block rounded-3xl bg-card border border-border p-4 flex gap-4 hover:shadow-md transition-shadow"
                >
                  <div className="h-14 w-14 rounded-2xl bg-gradient-impact shrink-0 flex items-center justify-center text-white font-display font-bold text-xl">
                    {(opp.category ?? opp.title).charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-primary">
                        {matchPct != null ? `${matchPct}% match` : opp.urgency}
                      </span>
                      {distanceKm != null && (
                        <span className="text-xs text-muted-foreground">· {distanceKm.toFixed(1)} km</span>
                      )}
                    </div>
                    <h3 className="font-semibold text-sm truncate">{opp.title}</h3>
                    <p className="text-xs text-muted-foreground truncate">{opp.location ?? "Location TBD"}</p>
                    {opp.skills_required && opp.skills_required.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {opp.skills_required.slice(0, 3).map((s) => (
                          <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{s}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button size="icon" variant="soft" className="self-center">
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* AI insight */}
        <section className="rounded-3xl bg-gradient-hero p-5 text-white relative overflow-hidden animate-fade-up">
          <div className="absolute -right-8 -top-8 h-32 w-32 bg-white/20 rounded-full blur-2xl" />
          <div className="relative flex items-start gap-3">
            <div className="h-10 w-10 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center shrink-0">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-display font-semibold">AI insight</h3>
              <p className="text-sm text-white/85 mt-1">
                {recommendations.length > 0 && recommendations[0].matchPct != null
                  ? `Top match: ${recommendations[0].matchPct}% on "${recommendations[0].opp.title}". Apply now to make impact this week.`
                  : "Complete your skills and location to unlock personalized matches."}
              </p>
              <Button asChild variant="glass" size="sm" className="mt-3">
                <Link to="/opportunities">See matches <ArrowRight className="h-4 w-4" /></Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
};

const SectionHeader = ({ title, to, badge }: { title: string; to: string; badge?: string }) => (
  <div className="flex items-center justify-between mb-3">
    <h2 className="font-display font-semibold text-lg flex items-center gap-2">
      {title}
      {badge && (
        <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-gradient-cta text-accent-foreground">
          {badge}
        </span>
      )}
    </h2>
    <Link to={to} className="text-xs font-semibold text-primary hover:underline">See all</Link>
  </div>
);

const SkeletonCard = () => (
  <div className="rounded-3xl bg-card border border-border h-20 animate-pulse" />
);

interface StatCardProps {
  icon: typeof Heart;
  label: string;
  value: string;
  delta: string;
  tone: "impact" | "trust" | "cta";
}
const StatCard = ({ icon: Icon, label, value, delta, tone }: StatCardProps) => {
  const grad = tone === "impact" ? "bg-gradient-impact" : tone === "trust" ? "bg-gradient-trust" : "bg-gradient-cta";
  return (
    <div className="rounded-3xl bg-card border border-border p-4">
      <div className={`h-9 w-9 rounded-xl ${grad} flex items-center justify-center text-white mb-3`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="text-2xl font-display font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-[10px] text-primary font-semibold mt-1">{delta}</div>
    </div>
  );
};

export default Dashboard;
