import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";
import heroImg from "@/assets/auth-hero.jpg";

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  footer?: ReactNode;
}

export const AuthLayout = ({ children, title, subtitle, footer }: AuthLayoutProps) => {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-2 bg-background">
      {/* Left visual panel — desktop only */}
      <aside className="hidden lg:flex relative overflow-hidden bg-gradient-hero text-white p-12 flex-col justify-between">
        <div className="absolute inset-0 bg-gradient-aurora opacity-60" />
        <Link to="/" className="relative z-10">
          <Logo variant="light" />
        </Link>
        <div className="relative z-10 max-w-md space-y-5">
          <h2 className="text-4xl font-display font-bold leading-tight">
            Every skill counts. Every minute matters.
          </h2>
          <p className="text-white/85">
            Join a movement of doers turning fragmented community needs into measurable impact.
          </p>
          <img
            src={heroImg}
            alt=""
            width={1024}
            height={1280}
            loading="lazy"
            className="rounded-3xl shadow-2xl border border-white/20 max-h-96 object-cover w-full"
          />
        </div>
        <div className="relative z-10 flex gap-6 text-sm">
          <div>
            <div className="text-3xl font-display font-bold">12.4K</div>
            <div className="text-white/70">Volunteers</div>
          </div>
          <div>
            <div className="text-3xl font-display font-bold">980</div>
            <div className="text-white/70">Organizations</div>
          </div>
          <div>
            <div className="text-3xl font-display font-bold">3.2K</div>
            <div className="text-white/70">Active needs</div>
          </div>
        </div>
      </aside>

      {/* Form panel */}
      <section className="relative flex flex-col min-h-screen px-6 py-8 sm:px-10">
        <div className="lg:hidden flex justify-center pt-4">
          <Link to="/"><Logo /></Link>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-md py-10">
            <div className="space-y-2 mb-7 animate-fade-up">
              <h1 className="text-3xl sm:text-4xl font-display font-bold tracking-tight">{title}</h1>
              {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
            </div>
            <div className="animate-fade-up">{children}</div>
            {footer && <div className="mt-8 text-center text-sm">{footer}</div>}
          </div>
        </div>
      </section>
    </div>
  );
};
