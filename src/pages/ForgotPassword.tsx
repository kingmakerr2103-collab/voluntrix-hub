import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { AuthLayout } from "@/components/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSent(true);
  };

  return (
    <AuthLayout
      title="Reset password"
      subtitle="We'll send you a secure reset link."
      footer={
        <Link to="/login" className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to sign in
        </Link>
      }
    >
      {sent ? (
        <div className="rounded-2xl bg-primary/10 border border-primary/20 p-5 flex gap-3">
          <CheckCircle2 className="h-6 w-6 text-primary shrink-0" />
          <div>
            <h3 className="font-display font-semibold">Check your inbox</h3>
            <p className="text-sm text-muted-foreground mt-1">
              If an account exists for that email, a reset link is on its way.
            </p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 rounded-xl"
              placeholder="you@community.org"
            />
          </div>
          <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Send reset link"}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
};

export default ForgotPassword;
