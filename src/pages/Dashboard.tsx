import { Link } from "react-router-dom";
import {
  Bell, Search, AlertTriangle, MapPin, Sparkles, ArrowRight, TrendingUp, Heart, Calendar, Users,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import bannerImg from "@/assets/dashboard-banner.jpg";

const Dashboard = () => {
  return (
    <AppShell>
      <div className="mx-auto max-w-2xl px-5 pt-8 pb-6 space-y-7">
        {/* Header */}
        <header className="flex items-center justify-between animate-fade-up">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Tuesday, Apr 25</p>
            <h1 className="text-2xl font-display font-bold mt-0.5">Hey Alex 👋</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="rounded-full">
              <Search className="h-5 w-5" />
            </Button>
            <Link to="/notifications" className="relative h-11 w-11 inline-flex items-center justify-center rounded-full hover:bg-muted">
              <Bell className="h-5 w-5" />
              <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-accent ring-2 ring-background" />
            </Link>
          </div>
        </header>

        {/* Urgent alert */}
        <div className="rounded-3xl bg-gradient-energy p-[1.5px] shadow-glow-cta animate-fade-up">
          <div className="rounded-[calc(1.5rem-2px)] bg-card px-5 py-4 flex items-center gap-4">
            <div className="h-11 w-11 rounded-2xl bg-gradient-energy flex items-center justify-center text-white shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wider font-bold text-accent">Urgent</span>
                <span className="text-xs text-muted-foreground">2 km away</span>
              </div>
              <p className="font-semibold text-sm truncate">Flood relief crew needed at Maple Park</p>
            </div>
            <Button size="sm" variant="hero">Help</Button>
          </div>
        </div>

        {/* Stats grid */}
        <section className="grid grid-cols-2 gap-3 animate-fade-up">
          <StatCard icon={Heart}    label="Hours given"  value="48" delta="+6 this week" tone="impact" />
          <StatCard icon={TrendingUp} label="Impact score" value="820" delta="Top 8%"      tone="trust" />
          <StatCard icon={Calendar} label="Upcoming"     value="3"   delta="next: Sat"     tone="cta" />
          <StatCard icon={Users}    label="Team mates"   value="14"  delta="2 new"         tone="impact" />
        </section>

        {/* Map preview */}
        <section className="animate-fade-up">
          <SectionHeader title="Needs near you" to="/map" />
          <Link to="/map" className="block relative rounded-3xl overflow-hidden shadow-md border border-border group">
            <img src={bannerImg} alt="Map preview" width={1280} height={640} loading="lazy" className="w-full h-44 object-cover transition-transform group-hover:scale-105 duration-500" />
            <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-transparent to-transparent" />
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4" />
                <span className="font-medium">12 active needs nearby</span>
              </div>
              <Button size="sm" variant="glass">Open map</Button>
            </div>
          </Link>
        </section>

        {/* Recommended */}
        <section className="animate-fade-up">
          <SectionHeader title="Matched for your skills" to="/opportunities" badge="AI" />
          <div className="space-y-3">
            {recommendations.map((r) => (
              <article key={r.id} className="rounded-3xl bg-card border border-border p-4 flex gap-4 hover:shadow-md transition-shadow">
                <div className={`h-14 w-14 rounded-2xl ${r.gradient} shrink-0 flex items-center justify-center text-white font-display font-bold text-xl`}>
                  {r.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-primary">{r.tag}</span>
                    <span className="text-xs text-muted-foreground">· {r.distance}</span>
                  </div>
                  <h3 className="font-semibold text-sm truncate">{r.title}</h3>
                  <p className="text-xs text-muted-foreground truncate">{r.org}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {r.skills.map((s) => (
                      <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{s}</span>
                    ))}
                  </div>
                </div>
                <Button size="icon" variant="soft" className="self-center">
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </article>
            ))}
          </div>
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
                Your skills are in <strong>3× higher demand</strong> this week within 5 km. Consider these 5 matches.
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

const recommendations = [
  { id: 1, emoji: "🌱", title: "Community garden setup", org: "Greener Tomorrow", tag: "98% match", distance: "1.2 km", skills: ["Gardening", "Outdoor"], gradient: "bg-gradient-impact" },
  { id: 2, emoji: "📚", title: "Weekend tutoring (Math)", org: "Bright Futures", tag: "94% match", distance: "3 km", skills: ["Teaching", "Math"], gradient: "bg-gradient-trust" },
  { id: 3, emoji: "🍲", title: "Meal packing drive", org: "Food For All", tag: "87% match", distance: "5 km", skills: ["Logistics"], gradient: "bg-gradient-cta" },
];

export default Dashboard;
