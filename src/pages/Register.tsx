import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { AuthLayout } from "@/components/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { GoogleIcon, AppleIcon } from "@/components/SocialIcons";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

const Register = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    // Note: we intentionally do NOT pass a `role` in metadata. The new
    // /choose-role step asks the user explicitly after sign-up.
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/choose-role`,
        data: {
          full_name: name,
        },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Account created! Let's pick your role.");
    navigate("/choose-role");
  };

  const handleSocial = async (provider: "google" | "apple") => {
    if (provider === "apple") {
      toast.info("Apple sign-in is not configured yet.");
      return;
    }
    const result = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: `${window.location.origin}/choose-role`,
    });
    if (result.redirected) return;
    if (result.error) {
      toast.error(result.error.message ?? "Could not sign in with Google.");
      return;
    }
    navigate("/choose-role");
  };

  return (
    <AuthLayout
      title="Create your account."
      subtitle="Join the movement in just a few seconds."
      footer={
        <>
          Already a member?{" "}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Sign in
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

      <div className="relative my-5 flex items-center text-xs text-muted-foreground">
        <div className="flex-1 border-t border-border" />
        <span className="px-3">or with email</span>
        <div className="flex-1 border-t border-border" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Full name</Label>
          <Input
            id="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-12 rounded-xl"
            placeholder="Alex Rivera"
          />
        </div>
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
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-12 rounded-xl"
            placeholder="At least 8 characters"
          />
        </div>

        <label className="flex items-start gap-2 text-sm cursor-pointer">
          <Checkbox id="terms" required className="mt-0.5" />
          <span className="text-muted-foreground">
            I agree to the <a href="#" className="text-primary font-medium hover:underline">Terms</a> and{" "}
            <a href="#" className="text-primary font-medium hover:underline">Privacy Policy</a>
          </span>
        </label>

        <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Create account"}
        </Button>
      </form>
    </AuthLayout>
  );
};

export default Register;
