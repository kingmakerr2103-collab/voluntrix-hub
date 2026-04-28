import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, HandHeart, Loader2, Check } from "lucide-react";
import { AuthLayout } from "@/components/AuthLayout";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toUserMessage } from "@/lib/errors";

type Role = "volunteer" | "organization";

const ChooseRole = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selected, setSelected] = useState<Set<Role>>(new Set(["volunteer"]));
  const [existing, setExisting] = useState<Set<Role>>(new Set());
  const [loading, setLoading] = useState(false);

  // Preload any roles the user already has so they can ADD the other one without losing it.
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      if (data && data.length > 0) {
        const have = new Set<Role>(
          data
            .map((r) => r.role as string)
            .filter((r): r is Role => r === "volunteer" || r === "organization"),
        );
        setExisting(have);
        if (have.size > 0) setSelected(new Set(have));
      }
    })();
  }, [user]);

  const toggle = (r: Role) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(r)) {
        if (next.size === 1) return prev; // require at least one
        next.delete(r);
      } else {
        next.add(r);
      }
      return next;
    });
  };

  const submit = async () => {
    if (!user) {
      toast.error("Please sign in first.");
      navigate("/login");
      return;
    }
    setLoading(true);

    const toAdd: Role[] = Array.from(selected).filter((r) => !existing.has(r));
    const toRemove: Role[] = Array.from(existing).filter((r) => !selected.has(r));

    if (toRemove.length > 0) {
      await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", user.id)
        .in("role", toRemove);
    }

    if (toAdd.length > 0) {
      const rows = toAdd.map((role) => ({ user_id: user.id, role }));
      const { error } = await supabase.from("user_roles").insert(rows);
      if (error) {
        setLoading(false);
        toast.error(toUserMessage(error));
        return;
      }
    }

    setLoading(false);
    const labels = Array.from(selected).map((r) => (r === "organization" ? "an organization" : "a volunteer"));
    toast.success(`Welcome aboard as ${labels.join(" and ")}!`);
    navigate("/profile-setup", { replace: true });
  };

  return (
    <AuthLayout
      title="How will you join?"
      subtitle="Pick one or both — you can be a volunteer, an organization, or both."
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        {[
          { id: "volunteer" as Role, label: "I'm a Volunteer", icon: HandHeart, desc: "Find opportunities and help nearby" },
          { id: "organization" as Role, label: "I'm an Organization", icon: Building2, desc: "Coordinate projects & volunteers" },
        ].map(({ id, label, icon: Icon, desc }) => {
          const active = selected.has(id);
          return (
            <button
              key={id}
              type="button"
              aria-pressed={active}
              onClick={() => toggle(id)}
              className={cn(
                "relative p-5 rounded-2xl text-left border-2 transition-all",
                active
                  ? "border-primary bg-primary/5 shadow-glow-primary"
                  : "border-border bg-card hover:border-primary/30",
              )}
            >
              {active && (
                <div className="absolute top-3 right-3 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                  <Check className="h-4 w-4" />
                </div>
              )}
              <div
                className={cn(
                  "h-10 w-10 rounded-xl flex items-center justify-center mb-3",
                  active ? "bg-gradient-impact text-primary-foreground" : "bg-muted text-muted-foreground",
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="font-semibold">{label}</div>
              <div className="text-sm text-muted-foreground mt-1">{desc}</div>
            </button>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground mb-3 text-center">
        Tip: select both to switch between volunteering and running an organization.
      </p>

      <Button variant="hero" size="lg" className="w-full" onClick={submit} disabled={loading || selected.size === 0}>
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Continue"}
      </Button>
    </AuthLayout>
  );
};

export default ChooseRole;
