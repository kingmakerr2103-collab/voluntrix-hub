import { toUserMessage } from "@/lib/errors";
import { useEffect, useState } from "react";
import { Briefcase, Loader2, Users, Calendar, ArrowRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type Project = Database["public"]["Tables"]["projects"]["Row"];
type Status = Database["public"]["Enums"]["project_status"];

const STATUS_COLOR: Record<Status, string> = {
  planning: "bg-secondary/15 text-secondary",
  active: "bg-primary/15 text-primary",
  on_hold: "bg-warning/15 text-warning",
  completed: "bg-muted text-muted-foreground",
  cancelled: "bg-destructive/15 text-destructive",
};

const Projects = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"all" | Status>("all");

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("projects").select("*").order("created_at", { ascending: false });
      if (error) toast({ title: "Couldn't load projects", description: error.message, variant: "destructive" });
      setProjects((data ?? []) as Project[]);
      setLoading(false);
    })();
  }, []);

  const filtered = tab === "all" ? projects : projects.filter((p) => p.status === tab);

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl px-5 pt-8 pb-6 space-y-5">
        <header className="animate-fade-up">
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Coordinate</p>
          <h1 className="text-3xl font-display font-bold">Projects</h1>
          <p className="text-muted-foreground mt-1 text-sm">Track active initiatives and your contributions.</p>
        </header>

        <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1 animate-fade-up">
          {(["all", "active", "planning", "on_hold", "completed"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-colors",
                tab === t ? "bg-foreground text-background border-foreground" : "bg-card border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {t === "all" ? "All" : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl bg-card border border-border p-10 text-center animate-fade-up">
            <div className="h-16 w-16 rounded-2xl bg-gradient-trust mx-auto flex items-center justify-center text-secondary-foreground mb-3">
              <Briefcase className="h-7 w-7" />
            </div>
            <h2 className="font-display text-lg font-bold">No projects yet</h2>
            <p className="text-sm text-muted-foreground mt-1">Once you join one, it'll show up here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
};

const ProjectCard = ({ project }: { project: Project }) => (
  <article className="rounded-3xl bg-card border border-border p-5 hover:shadow-md transition-shadow animate-fade-up">
    <div className="flex items-start justify-between gap-3 mb-2">
      <div className="min-w-0">
        <span className={cn("text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full", STATUS_COLOR[project.status])}>
          {project.status}
        </span>
        <h3 className="font-display font-bold text-lg mt-1.5">{project.title}</h3>
        {project.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{project.description}</p>}
      </div>
      <Button size="icon" variant="soft" className="shrink-0">
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>

    <div className="mt-3">
      <div className="flex items-center justify-between text-xs mb-1.5">
        <span className="font-semibold">Progress</span>
        <span className="text-muted-foreground">{project.progress}%</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-gradient-impact rounded-full transition-all" style={{ width: `${project.progress}%` }} />
      </div>
    </div>

    <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
      {project.start_date && (
        <span className="inline-flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {new Date(project.start_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          {project.end_date ? ` → ${new Date(project.end_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}` : ""}
        </span>
      )}
      <span className="inline-flex items-center gap-1">
        <Users className="h-3 w-3" /> Team
      </span>
    </div>
  </article>
);

export default Projects;
