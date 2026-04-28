import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, HandHeart, Loader2 } from "lucide-react";
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
  const [role, setRole] = useState<Role>("volunteer");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!user) {
      toast.error("Please sign in first.");
      navigate("/login");
      return;
    }
    setLoading(true);
    const { error } = await supabase
      .from("user_roles")
      .insert({ user_id: user.id, role });
    setLoading(false);
    if (error && !/duplicate|unique/i.test(error.message)) {
      toast.error(toUserMessage(error));
      return;
    }
    toast.success(`Welcome aboard as ${role === "organization" ? "an organization" : "a volunteer"}!`);
    navigate("/profile-setup", { replace: true });
  };

  return (
    <AuthLayout
      title="How will you join?"
      subtitle="Pick the role that best describes you. You can change this later."
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        {[
          { id: "volunteer" as Role, label: "I'm a Volunteer", icon: HandHeart, desc: "Find opportunities and help nearby" },
          { id: "organization" as Role, label: "I'm an Organization", icon: Building2, desc: "Coordinate projects & volunteers" },
        ].map(({ id, label, icon: Icon, desc }) => (
          <button
            key={id}
            type="button"
            onClick={() => setRole(id)}
            className={cn(
              "p-5 rounded-2xl text-left border-2 transition-all",
              role === id
                ? "border-primary bg-primary/5 shadow-glow-primary"
                : "border-border bg-card hover:border-primary/30",
            )}
          >
            <div
              className={cn(
                "h-10 w-10 rounded-xl flex items-center justify-center mb-3",
                role === id ? "bg-gradient-impact text-primary-foreground" : "bg-muted text-muted-foreground",
              )}
            >
              <Icon className="h-5 w-5" />
            </div>
            <div className="font-semibold">{label}</div>
            <div className="text-sm text-muted-foreground mt-1">{desc}</div>
          </button>
        ))}
      </div>

      <Button variant="hero" size="lg" className="w-full" onClick={submit} disabled={loading}>
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Continue"}
      </Button>
    </AuthLayout>
  );
};

export default ChooseRole;
