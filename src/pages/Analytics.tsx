import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend as ChartLegend,
} from "recharts";
import { TrendingUp, Users, Activity, Heart, Loader2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type Opportunity = Database["public"]["Tables"]["opportunities"]["Row"];
type Application = Database["public"]["Tables"]["applications"]["Row"];
type Project = Database["public"]["Tables"]["projects"]["Row"];

const PIE_COLORS = ["hsl(var(--destructive))", "hsl(var(--accent))", "hsl(var(--secondary))", "hsl(var(--primary))"];

const Analytics = () => {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [oRes, aRes, pRes] = await Promise.all([
        supabase.from("opportunities").select("*"),
        supabase.from("applications").select("*"),
        supabase.from("projects").select("*"),
      ]);
      if (oRes.error || aRes.error || pRes.error) {
        toast({
          title: "Couldn't load analytics",
          description: oRes.error?.message ?? aRes.error?.message ?? pRes.error?.message,
          variant: "destructive",
        });
      }
      setOpportunities((oRes.data ?? []) as Opportunity[]);
      setApplications((aRes.data ?? []) as Application[]);
      setProjects((pRes.data ?? []) as Project[]);
      setLoading(false);
    })();
  }, []);

  const urgencyData = useMemo(() => {
    const counts: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 };
    opportunities.forEach((o) => (counts[o.urgency] = (counts[o.urgency] ?? 0) + 1));
    return [
      { name: "Critical", value: counts.critical },
      { name: "High", value: counts.high },
      { name: "Medium", value: counts.medium },
      { name: "Low", value: counts.low },
    ].filter((d) => d.value > 0);
  }, [opportunities]);

  const weekly = useMemo(() => {
    // Last 7 days of applications
    const days: { day: string; applications: number; opportunities: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString(undefined, { weekday: "short" });
      days.push({
        day: label,
        applications: applications.filter((a) => a.created_at.slice(0, 10) === key).length,
        opportunities: opportunities.filter((o) => o.created_at.slice(0, 10) === key).length,
      });
    }
    return days;
  }, [applications, opportunities]);

  const stats = [
    { icon: Heart, label: "Open opportunities", value: opportunities.filter((o) => o.status === "open").length, tone: "impact" as const },
    { icon: Users, label: "Total applications", value: applications.length, tone: "trust" as const },
    { icon: Activity, label: "Active projects", value: projects.filter((p) => p.status === "active").length, tone: "cta" as const },
    { icon: TrendingUp, label: "Critical needs", value: opportunities.filter((o) => o.urgency === "critical").length, tone: "impact" as const },
  ];

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl px-5 pt-8 pb-6 space-y-6">
        <header className="animate-fade-up">
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Insights</p>
          <h1 className="text-3xl font-display font-bold">Analytics</h1>
          <p className="text-muted-foreground mt-1 text-sm">Engagement and impact across your community.</p>
        </header>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Stat grid */}
            <section className="grid grid-cols-2 gap-3 animate-fade-up">
              {stats.map((s) => {
                const grad = s.tone === "impact" ? "bg-gradient-impact" : s.tone === "trust" ? "bg-gradient-trust" : "bg-gradient-cta";
                return (
                  <div key={s.label} className="rounded-3xl bg-card border border-border p-4">
                    <div className={`h-9 w-9 rounded-xl ${grad} flex items-center justify-center text-white mb-3`}>
                      <s.icon className="h-4 w-4" />
                    </div>
                    <div className="text-2xl font-display font-bold">{s.value}</div>
                    <div className="text-xs text-muted-foreground">{s.label}</div>
                  </div>
                );
              })}
            </section>

            {/* Weekly bar chart */}
            <section className="rounded-3xl bg-card border border-border p-5 animate-fade-up">
              <h2 className="font-display font-semibold text-lg mb-4">Last 7 days</h2>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weekly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="day" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} stroke="hsl(var(--border))" />
                    <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} stroke="hsl(var(--border))" allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 12,
                        fontSize: 12,
                      }}
                    />
                    <ChartLegend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="opportunities" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="applications" fill="hsl(var(--accent))" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* Urgency pie */}
            {urgencyData.length > 0 && (
              <section className="rounded-3xl bg-card border border-border p-5 animate-fade-up">
                <h2 className="font-display font-semibold text-lg mb-4">Urgency mix</h2>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={urgencyData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={45} paddingAngle={3}>
                        {urgencyData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 12,
                          fontSize: 12,
                        }}
                      />
                      <ChartLegend wrapperStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
};

export default Analytics;
