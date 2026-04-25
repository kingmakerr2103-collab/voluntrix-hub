import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  variant?: "default" | "light";
  showWordmark?: boolean;
}

export const Logo = ({ className, variant = "default", showWordmark = true }: LogoProps) => {
  const textClass = variant === "light" ? "text-white" : "text-foreground";
  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <div className="relative h-9 w-9">
        <div className="absolute inset-0 rounded-xl bg-gradient-impact rotate-6" />
        <div className="absolute inset-0 rounded-xl bg-gradient-cta -rotate-6 mix-blend-multiply opacity-80" />
        <div className="absolute inset-[3px] rounded-[10px] bg-background flex items-center justify-center">
          <span className="font-display font-bold text-lg text-gradient-hero leading-none">V</span>
        </div>
      </div>
      {showWordmark && (
        <span className={cn("font-display font-bold text-xl tracking-tight", textClass)}>
          Voluntrix
        </span>
      )}
    </div>
  );
};
