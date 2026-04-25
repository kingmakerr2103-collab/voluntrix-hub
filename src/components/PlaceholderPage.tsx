import { ReactNode } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Construction } from "lucide-react";

interface PlaceholderProps {
  title: string;
  description: string;
  icon?: ReactNode;
}

export const PlaceholderPage = ({ title, description, icon }: PlaceholderProps) => (
  <AppShell>
    <div className="mx-auto max-w-2xl px-5 pt-8 pb-6">
      <header className="mb-7 animate-fade-up">
        <h1 className="text-3xl font-display font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground mt-1">{description}</p>
      </header>

      <div className="rounded-3xl bg-card border border-border p-10 text-center animate-fade-up">
        <div className="h-16 w-16 rounded-2xl bg-gradient-impact mx-auto flex items-center justify-center text-primary-foreground mb-4 shadow-glow-primary">
          {icon ?? <Construction className="h-7 w-7" />}
        </div>
        <h2 className="font-display text-xl font-bold">Coming in the next phase</h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
          This screen is wired into the navigation and will be built out in upcoming front-end phases.
        </p>
        <Button variant="soft" className="mt-5">Notify me when it's ready</Button>
      </div>
    </div>
  </AppShell>
);
