import { FormEvent, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { AuthLayout } from "@/components/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { GoogleIcon, AppleIcon } from "@/components/SocialIcons";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { resolvePostAuthRoute } from "@/lib/postAuthRoute";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Welcome back!");
    const next = data.user ? await resolvePostAuthRoute(data.user.id, from) : from;
    navigate(next, { replace: true });
  };

  const handleSocial = async (provider: "google" | "apple") => {
    if (provider === "apple") {
      toast.info("Apple sign-in is not configured yet.");
      return;
    }
    const result = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: `${window.location.origin}/dashboard`,
    });
    if (result.redirected) return;
    if (result.error) {
      toast.error(result.error.message ?? "Could not sign in with Google.");
      return;
    }
    navigate(from, { replace: true });
  };

  return (
    <AuthLayout
      title="Welcome back."
      subtitle="Sign in to continue creating impact."
      footer={
        <>
          New to Voluntrix?{" "}
          <Link to="/register" className="font-semibold text-primary hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3 mb-5">
        <Button variant="outline" size="lg" type="button" onClick={() => handleSocial("google")}>
          <GoogleIcon className="h-5 w-5" /> Google
        </Button>
        <Button variant="outline" size="lg" type="button" onClick={() => handleSocial("apple")}>
          <AppleIcon className="h-5 w-5" /> Apple
        </Button>
      </div>

      <div className="relative my-6 flex items-center text-xs text-muted-foreground">
        <div className="flex-1 border-t border-border" />
        <span className="px-3">or with email</span>
        <div className="flex-1 border-t border-border" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@community.org"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 rounded-xl"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link to="/forgot-password" className="text-xs font-medium text-primary hover:underline">
              Forgot?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPwd ? "text" : "password"}
              placeholder="••••••••"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 rounded-xl pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPwd(!showPwd)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showPwd ? "Hide password" : "Show password"}
            >
              {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <Checkbox id="remember" />
          <span>Remember me on this device</span>
        </label>

        <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Sign in"}
        </Button>
      </form>
    </AuthLayout>
  );
};

export default Login;
