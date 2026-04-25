import { NavLink, useLocation } from "react-router-dom";
import { Home, Compass, MapPin, Briefcase, User } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/dashboard", icon: Home, label: "Home" },
  { to: "/opportunities", icon: Compass, label: "Discover" },
  { to: "/map", icon: MapPin, label: "Map" },
  { to: "/projects", icon: Briefcase, label: "Projects" },
  { to: "/profile", icon: User, label: "Profile" },
];

export const BottomNav = () => {
  const location = useLocation();
  // Hide on auth + onboarding
  const hidden = ["/login", "/register", "/forgot-password", "/profile-setup", "/", "/welcome"].includes(location.pathname);
  if (hidden) return null;

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 pb-safe">
      <div className="mx-auto max-w-2xl px-3 pb-3">
        <div className="relative rounded-3xl bg-card/90 backdrop-blur-xl border border-border shadow-lg">
          <ul className="grid grid-cols-5">
            {tabs.map(({ to, icon: Icon, label }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  className={({ isActive }) =>
                    cn(
                      "flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium transition-all",
                      isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span
                        className={cn(
                          "flex items-center justify-center h-9 w-9 rounded-2xl transition-all duration-300",
                          isActive
                            ? "bg-gradient-impact text-primary-foreground shadow-glow-primary scale-105"
                            : "bg-transparent",
                        )}
                      >
                        <Icon className="h-[18px] w-[18px]" strokeWidth={2.25} />
                      </span>
                      <span className="tracking-wide">{label}</span>
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </nav>
  );
};
