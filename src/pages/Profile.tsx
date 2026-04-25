import { Link } from "react-router-dom";
import { Settings, Bell, MessageSquare, BarChart3, LogOut, ChevronRight, Edit3, Award, Clock, Heart } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";

const Profile = () => {
  return (
    <AppShell>
      <div className="mx-auto max-w-2xl px-5 pt-8 pb-6 space-y-6">
        {/* Hero */}
        <section className="relative rounded-3xl overflow-hidden bg-gradient-hero p-6 text-white animate-fade-up">
          <div className="absolute inset-0 bg-gradient-aurora opacity-50" />
          <div className="relative flex items-center gap-4">
            <div className="h-20 w-20 rounded-2xl bg-white/20 backdrop-blur border-2 border-white/30 flex items-center justify-center font-display font-bold text-3xl">
              A
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-display font-bold">Alex Rivera</h1>
              <p className="text-sm text-white/80">Volunteer · Lisbon, PT</p>
              <div className="flex gap-1 mt-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20 backdrop-blur">
                  ⭐ Top contributor
                </span>
              </div>
            </div>
            <Button variant="glass" size="icon">
              <Edit3 className="h-4 w-4" />
            </Button>
          </div>

          <div className="relative grid grid-cols-3 gap-3 mt-5">
            {[
              { icon: Clock, label: "Hours", value: "48" },
              { icon: Heart, label: "Projects", value: "12" },
              { icon: Award, label: "Badges", value: "7" },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="rounded-2xl bg-white/15 backdrop-blur-md p-3 text-center">
                <Icon className="h-4 w-4 mx-auto opacity-80" />
                <div className="font-display font-bold text-xl mt-1">{value}</div>
                <div className="text-[10px] uppercase tracking-wider opacity-70">{label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Skills */}
        <section className="rounded-3xl bg-card border border-border p-5 animate-fade-up">
          <h2 className="font-display font-semibold text-lg mb-3">Skills</h2>
          <div className="flex flex-wrap gap-2">
            {["Teaching", "Logistics", "Photography", "Translation", "Childcare"].map((s) => (
              <span key={s} className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold border border-primary/15">
                {s}
              </span>
            ))}
          </div>
        </section>

        {/* Menu */}
        <section className="rounded-3xl bg-card border border-border overflow-hidden animate-fade-up">
          {[
            { to: "/messages", icon: MessageSquare, label: "Messages", hint: "3 new" },
            { to: "/notifications", icon: Bell, label: "Notifications" },
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

        <Button variant="outline" size="lg" className="w-full" asChild>
          <Link to="/login"><LogOut className="h-4 w-4" /> Sign out</Link>
        </Button>
      </div>
    </AppShell>
  );
};

export default Profile;
