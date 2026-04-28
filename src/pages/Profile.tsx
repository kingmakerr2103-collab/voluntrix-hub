import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Settings, Bell, MessageSquare, BarChart3, LogOut, ChevronRight, Edit3, Award, Clock, Heart, Loader2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { UseMyLocationButton } from "@/components/UseMyLocationButton";
import { toast } from "@/hooks/use-toast";
import { toUserMessage } from "@/lib/errors";
import type { Database } from "@/integrations/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

const Profile = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState({ accepted: 0, projects: 0, badges: 0 });
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const [profileRes, appsRes, projectsRes, msgRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("applications").select("status").eq("volunteer_id", user.id),
        supabase.from("project_members").select("project_id").eq("user_id", user.id),
        supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("read", false),
      ]);
      if (cancelled) return;
      if (profileRes.error) toast({ title: "Couldn't load profile", description: toUserMessage(profileRes.error), variant: "destructive" });
      setProfile((profileRes.data as Profile | null) ?? null);
      const accepted = (appsRes.data ?? []).filter((a) => a.status === "accepted").length;
      const projects = (projectsRes.data ?? []).length;
      setStats({ accepted, projects, badges: Math.min(7, accepted + projects) });
      setUnread(msgRes.count ?? 0);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const displayName = useMemo(() => {
    const full = profile?.full_name?.trim();
    if (full) return full;
    const meta = (user?.user_metadata ?? {}) as { full_name?: string; name?: string };
    return (meta.full_name ?? meta.name ?? user?.email?.split("@")[0] ?? "Anonymous").trim();
  }, [profile, user]);

  const initial = displayName.charAt(0).toUpperCase();
  const skills = (profile?.skills ?? []) as string[];

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

  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl px-5 pt-8 pb-6 space-y-6">
        {/* Hero */}
        <section className="relative rounded-3xl overflow-hidden bg-gradient-hero p-6 text-white animate-fade-up">
          <div className="absolute inset-0 bg-gradient-aurora opacity-50" />
          <div className="relative flex items-center gap-4">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={displayName}
                className="h-20 w-20 rounded-2xl object-cover border-2 border-white/30"
              />
            ) : (
              <div className="h-20 w-20 rounded-2xl bg-white/20 backdrop-blur border-2 border-white/30 flex items-center justify-center font-display font-bold text-3xl">
                {initial}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-display font-bold truncate">{displayName}</h1>
              <p className="text-sm text-white/80 truncate">
                Volunteer · {profile?.location ?? "Set your location"}
              </p>
              {stats.accepted >= 5 && (
                <div className="flex gap-1 mt-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20 backdrop-blur">
                    ⭐ Top contributor
                  </span>
                </div>
              )}
            </div>
            <Button asChild variant="glass" size="icon">
              <Link to="/profile-setup" aria-label="Edit profile">
                <Edit3 className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="relative grid grid-cols-3 gap-3 mt-5">
            {[
              { icon: Clock, label: "Accepted", value: String(stats.accepted) },
              { icon: Heart, label: "Projects", value: String(stats.projects) },
              { icon: Award, label: "Badges", value: String(stats.badges) },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="rounded-2xl bg-white/15 backdrop-blur-md p-3 text-center">
                <Icon className="h-4 w-4 mx-auto opacity-80" />
                <div className="font-display font-bold text-xl mt-1">{value}</div>
                <div className="text-[10px] uppercase tracking-wider opacity-70">{label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Location */}
        <section className="rounded-3xl bg-card border border-border p-5 animate-fade-up space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold text-lg">Current location</h2>
            {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
          <p className="text-sm text-muted-foreground">
            {profile?.location ?? "No location saved yet."}
          </p>
          {profile?.latitude != null && profile?.longitude != null && (
            <p className="text-xs text-muted-foreground font-mono">
              📍 {profile.latitude.toFixed(5)}, {profile.longitude.toFixed(5)}
            </p>
          )}
          <UseMyLocationButton
            onLocate={(loc) => saveLocation(loc.latitude, loc.longitude, loc.address)}
          />
        </section>

        {/* Skills */}
        <section className="rounded-3xl bg-card border border-border p-5 animate-fade-up">
          <h2 className="font-display font-semibold text-lg mb-3">Skills</h2>
          {skills.length === 0 ? (
            <p className="text-sm text-muted-foreground">No skills added yet. <Link to="/profile-setup" className="text-primary font-semibold hover:underline">Add some</Link>.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {skills.map((s) => (
                <span key={s} className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold border border-primary/15">
                  {s}
                </span>
              ))}
            </div>
          )}
        </section>

        {/* Menu */}
        <section className="rounded-3xl bg-card border border-border overflow-hidden animate-fade-up">
          {[
            { to: "/messages", icon: MessageSquare, label: "Messages" },
            { to: "/notifications", icon: Bell, label: "Notifications", hint: unread > 0 ? `${unread} new` : undefined },
            { to: "/analytics", icon: BarChart3, label: "Analytics" },
            { to: "/settings", icon: Settings, label: "Settings" },
          ].map(({ to, icon: Icon, label, hint }) => (
            <Link key={to} to={to} className="flex items-center gap-4 p-4 hover:bg-muted transition-colors border-b border-border last:border-0">
              <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
                <Icon className="h-5 w-5 text-muted-foreground" />
              </div>
              <span className="flex-1 font-medium">{label}</span>
              {hint && <span className="text-xs px-2 py-0.5 rounded-full bg-accent/15 text-accent font-semibold">{hint}</span>}
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          ))}
        </section>

        <Button variant="outline" size="lg" className="w-full" onClick={handleSignOut}>
          <LogOut className="h-4 w-4" /> Sign out
        </Button>
      </div>
    </AppShell>
  );
};

export default Profile;
