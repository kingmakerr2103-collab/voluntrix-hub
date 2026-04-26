import { useNavigate } from "react-router-dom";
import { LogOut, Settings as SettingsIcon } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const Settings = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out");
    navigate("/login", { replace: true });
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl px-5 pt-8 pb-6">
        <header className="mb-7 animate-fade-up">
          <h1 className="text-3xl font-display font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-1">Account, privacy, notifications and theme.</p>
        </header>

        <div className="rounded-3xl bg-card border border-border p-6 animate-fade-up space-y-5">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-gradient-impact flex items-center justify-center text-primary-foreground shadow-glow-primary">
              <SettingsIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="font-display font-semibold">Signed in as</p>
              <p className="text-sm text-muted-foreground">{user?.email ?? "—"}</p>
            </div>
          </div>

          <div className="border-t border-border pt-5">
            <p className="text-sm text-muted-foreground mb-3">
              More privacy, notification, and theme controls land in upcoming phases.
            </p>
            <Button variant="outline" size="lg" className="w-full" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
};

export default Settings;
