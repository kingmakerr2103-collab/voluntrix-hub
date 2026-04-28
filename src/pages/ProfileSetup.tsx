import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Camera, Check, Clock, Loader2, MapPin, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { UseMyLocationButton } from "@/components/UseMyLocationButton";
import { toUserMessage } from "@/lib/errors";

const ALL_SKILLS = [
  "Teaching", "Healthcare", "Cooking", "Gardening", "Tech support", "Translation",
  "Driving", "Construction", "Design", "Photography", "Childcare", "Elder care",
  "Counseling", "Event planning", "Fundraising", "Logistics",
];

const INTERESTS = [
  { id: "education",   label: "Education",    emoji: "📚" },
  { id: "environment", label: "Environment",  emoji: "🌱" },
  { id: "health",      label: "Health",       emoji: "❤️" },
  { id: "hunger",      label: "Hunger relief",emoji: "🍲" },
  { id: "animals",     label: "Animals",      emoji: "🐾" },
  { id: "elderly",     label: "Elderly care", emoji: "🧓" },
  { id: "youth",       label: "Youth",        emoji: "🧒" },
  { id: "disaster",    label: "Disaster aid", emoji: "🚨" },
];

const AVAILABILITY = [
  { id: "weekdays",    label: "Weekdays" },
  { id: "weekends",    label: "Weekends" },
  { id: "evenings",    label: "Evenings" },
  { id: "mornings",    label: "Mornings" },
  { id: "flexible",    label: "Flexible" },
  { id: "remote",      label: "Remote" },
];

const ProfileSetup = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [skills, setSkills] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [availability, setAvailability] = useState<string[]>([]);
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [loading, setLoading] = useState(false);

  const steps = ["Photo", "Skills", "Location", "Availability", "Interests"];

  const toggle = (arr: string[], setArr: (s: string[]) => void, v: string) => {
    setArr(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  };

  const finish = async () => {
    if (!user) {
      toast.error("Please sign in to finish setup.");
      navigate("/login");
      return;
    }
    setLoading(true);
    const location = [city, country].filter(Boolean).join(", ");
    const { error } = await supabase
      .from("profiles")
      .update({
        skills,
        interests,
        availability: availability.join(","),
        location: location || null,
        latitude: coords?.lat ?? null,
        longitude: coords?.lon ?? null,
        onboarding_complete: true,
      })
      .eq("user_id", user.id);
    setLoading(false);
    if (error) {
      toast.error(toUserMessage(error));
      return;
    }
    toast.success("Welcome to Voluntrix! 🎉");
    navigate("/dashboard");
  };

  const next = () => (step < steps.length - 1 ? setStep(step + 1) : finish());
  const back = () => step > 0 && setStep(step - 1);

  return (
    <div className="min-h-screen bg-gradient-mesh">
      <div className="mx-auto max-w-md px-5 pt-8 pb-10 min-h-screen flex flex-col">
        <header className="flex items-center justify-between mb-6">
          <button
            onClick={back}
            disabled={step === 0}
            className={cn("h-10 w-10 rounded-full flex items-center justify-center", step === 0 ? "opacity-0 pointer-events-none" : "hover:bg-muted")}
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <Logo showWordmark={false} />
          <button onClick={finish} className="text-xs font-medium text-muted-foreground hover:text-foreground">
            Skip
          </button>
        </header>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex gap-1.5">
            {steps.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1.5 rounded-full flex-1 transition-all duration-500",
                  i <= step ? "bg-gradient-impact" : "bg-muted",
                )}
              />
            ))}
          </div>
          <p className="text-[11px] uppercase tracking-widest font-semibold text-muted-foreground mt-3">
            Step {step + 1} of {steps.length} · {steps[step]}
          </p>
        </div>

        <div className="flex-1 animate-fade-up" key={step}>
          {step === 0 && (
            <Section title="Add a profile photo" subtitle="Help organizers recognize you in the field.">
              <div className="flex justify-center my-8">
                <button className="relative h-36 w-36 rounded-full bg-gradient-impact p-1 shadow-glow-primary">
                  <div className="h-full w-full rounded-full bg-card flex items-center justify-center">
                    <Camera className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <span className="absolute bottom-1 right-1 h-9 w-9 rounded-full bg-gradient-cta flex items-center justify-center text-accent-foreground shadow-glow-cta">
                    <Camera className="h-4 w-4" />
                  </span>
                </button>
              </div>
              <p className="text-center text-sm text-muted-foreground">JPG, PNG. Max 5 MB.</p>
            </Section>
          )}

          {step === 1 && (
            <Section title="What can you do?" subtitle="Pick all the skills you'd love to share." icon={Sparkles}>
              <div className="flex flex-wrap gap-2">
                {ALL_SKILLS.map((s) => (
                  <Chip key={s} active={skills.includes(s)} onClick={() => toggle(skills, setSkills, s)}>
                    {s}
                  </Chip>
                ))}
              </div>
            </Section>
          )}

          {step === 2 && (
            <Section title="Where are you based?" subtitle="We'll show needs near you." icon={MapPin}>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    placeholder="Lisbon"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="h-12 rounded-xl"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      placeholder="Portugal"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="h-12 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="radius">Radius</Label>
                    <Input id="radius" placeholder="10 km" className="h-12 rounded-xl" />
                  </div>
                </div>
                <Button variant="soft" size="lg" className="w-full" type="button">
                  <MapPin className="h-4 w-4" /> Use my current location
                </Button>
              </div>
            </Section>
          )}

          {step === 3 && (
            <Section title="When are you free?" subtitle="Pick the times that work for you." icon={Clock}>
              <div className="grid grid-cols-2 gap-2.5">
                {AVAILABILITY.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => toggle(availability, setAvailability, a.id)}
                    className={cn(
                      "p-4 rounded-2xl border-2 text-left font-medium transition-all",
                      availability.includes(a.id)
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border bg-card hover:border-primary/30",
                    )}
                  >
                    <span className={cn("inline-flex h-5 w-5 rounded-md border-2 items-center justify-center mr-2",
                      availability.includes(a.id) ? "bg-primary border-primary" : "border-border")}>
                      {availability.includes(a.id) && <Check className="h-3 w-3 text-primary-foreground" />}
                    </span>
                    {a.label}
                  </button>
                ))}
              </div>
            </Section>
          )}

          {step === 4 && (
            <Section title="What causes move you?" subtitle="We'll match you with what matters most.">
              <div className="grid grid-cols-2 gap-2.5">
                {INTERESTS.map((i) => (
                  <button
                    key={i.id}
                    onClick={() => toggle(interests, setInterests, i.label)}
                    className={cn(
                      "p-4 rounded-2xl border-2 text-left transition-all flex items-center gap-3",
                      interests.includes(i.label)
                        ? "border-primary bg-primary/5"
                        : "border-border bg-card hover:border-primary/30",
                    )}
                  >
                    <span className="text-2xl">{i.emoji}</span>
                    <span className="font-medium text-sm">{i.label}</span>
                  </button>
                ))}
              </div>
            </Section>
          )}
        </div>

        <Button variant="hero" size="xl" className="w-full mt-6" onClick={next} disabled={loading}>
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
            <>
              {step === steps.length - 1 ? "Finish setup" : "Continue"}
              <ArrowRight className="h-5 w-5" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

const Section = ({ title, subtitle, icon: Icon, children }: { title: string; subtitle: string; icon?: typeof Sparkles; children: React.ReactNode }) => (
  <div>
    <div className="space-y-2 mb-6">
      {Icon && (
        <div className="h-11 w-11 rounded-2xl bg-gradient-impact flex items-center justify-center text-primary-foreground shadow-glow-primary">
          <Icon className="h-5 w-5" />
        </div>
      )}
      <h2 className="text-3xl font-display font-bold tracking-tight">{title}</h2>
      <p className="text-muted-foreground">{subtitle}</p>
    </div>
    {children}
  </div>
);

const Chip = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button
    onClick={onClick}
    className={cn(
      "px-4 py-2 rounded-full text-sm font-medium border-2 transition-all",
      active
        ? "bg-gradient-impact text-primary-foreground border-transparent shadow-glow-primary"
        : "bg-card border-border hover:border-primary/30",
    )}
  >
    {children}
  </button>
);

export default ProfileSetup;
