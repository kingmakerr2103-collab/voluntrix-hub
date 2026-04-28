import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  variant?: "default" | "light";
  showWordmark?: boolean;
}

/**
 * Voluntrix mark: a hand-heart pulse formed from interconnected nodes.
 * Conveys community (nodes), care (heart), and momentum (pulse line).
 */
export const Logo = ({ className, variant = "default", showWordmark = true }: LogoProps) => {
  const textClass = variant === "light" ? "text-white" : "text-foreground";
  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <div className="relative h-9 w-9 shrink-0">
        {/* Layered gradient tiles for depth */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-impact rotate-6 shadow-glow-primary" />
        <div className="absolute inset-0 rounded-2xl bg-gradient-cta -rotate-6 mix-blend-multiply opacity-70" />
        <div className="absolute inset-[3px] rounded-[14px] bg-background flex items-center justify-center overflow-hidden">
          <svg
            viewBox="0 0 32 32"
            fill="none"
            className="h-6 w-6"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="vx-stroke" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="hsl(var(--primary))" />
                <stop offset="100%" stopColor="hsl(var(--accent))" />
              </linearGradient>
            </defs>
            {/* Connected community heart */}
            <path
              d="M16 27 C 8 21, 4 16, 6 11 C 7.5 7.5, 12 6.5, 16 10 C 20 6.5, 24.5 7.5, 26 11 C 28 16, 24 21, 16 27 Z"
              fill="url(#vx-stroke)"
              opacity="0.16"
            />
            {/* Pulse / connection line */}
            <path
              d="M3 17 H 10 L 12 13 L 15 21 L 18 11 L 21 17 H 29"
              stroke="url(#vx-stroke)"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            {/* Community nodes */}
            <circle cx="3" cy="17" r="1.6" fill="hsl(var(--primary))" />
            <circle cx="29" cy="17" r="1.6" fill="hsl(var(--accent))" />
          </svg>
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
