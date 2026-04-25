import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, MapPin, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import heroImg from "@/assets/auth-hero.jpg";

const Welcome = () => {
  return (
    <div className="min-h-screen relative overflow-hidden bg-background">
      {/* Aurora bg */}
      <div className="absolute inset-0 bg-gradient-aurora pointer-events-none" />
      <div className="absolute -top-32 -left-20 h-80 w-80 bg-primary/30 blur-3xl rounded-full animate-blob" />
      <div className="absolute top-40 -right-16 h-72 w-72 bg-accent/30 blur-3xl rounded-full animate-blob" style={{ animationDelay: "2s" }} />

      <div className="relative z-10 mx-auto max-w-md px-6 pt-12 pb-10 min-h-screen flex flex-col">
        <header className="flex items-center justify-between">
          <Logo />
          <Link to="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground">
            Sign in
          </Link>
        </header>

        <div className="flex-1 flex flex-col justify-center py-10">
          <div className="inline-flex items-center gap-2 self-start rounded-full bg-card border border-border px-3 py-1.5 text-xs font-medium shadow-sm animate-fade-up">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            AI-matched volunteer opportunities
          </div>

          <h1 className="mt-5 text-5xl sm:text-6xl font-display font-bold tracking-tight leading-[1.05] animate-fade-up">
            Volunteer where it <span className="text-gradient-hero">matters most</span>.
          </h1>
          <p className="mt-5 text-base text-muted-foreground leading-relaxed animate-fade-up">
            Voluntrix turns scattered community signals into action — match your skills to real needs, in real time.
          </p>

          <div className="mt-7 relative rounded-3xl overflow-hidden shadow-lg border border-border animate-scale-in">
            <img
              src={heroImg}
              alt="Diverse volunteers connected through a network of impact"
              width={1024}
              height={1280}
              className="w-full h-64 object-cover"
            />
            <div className="absolute bottom-3 left-3 right-3 flex gap-2">
              <div className="flex-1 rounded-2xl bg-card/90 backdrop-blur-md p-3 flex items-center gap-2">
                <div className="h-9 w-9 rounded-xl bg-gradient-impact flex items-center justify-center text-primary-foreground">
                  <Users className="h-4 w-4" />
                </div>
                <div className="text-xs">
                  <div className="font-bold text-sm">12,400+</div>
                  <div className="text-muted-foreground">Volunteers</div>
                </div>
              </div>
              <div className="flex-1 rounded-2xl bg-card/90 backdrop-blur-md p-3 flex items-center gap-2">
                <div className="h-9 w-9 rounded-xl bg-gradient-cta flex items-center justify-center text-accent-foreground">
                  <MapPin className="h-4 w-4" />
                </div>
                <div className="text-xs">
                  <div className="font-bold text-sm">3,200</div>
                  <div className="text-muted-foreground">Active needs</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <Button asChild variant="hero" size="xl" className="w-full">
            <Link to="/register">
              Get started <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="xl" className="w-full">
            <Link to="/login">I already have an account</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Welcome;
