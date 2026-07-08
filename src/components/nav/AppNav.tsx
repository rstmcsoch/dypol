import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shield, LogIn } from "lucide-react";
import { motion } from "framer-motion";
import { ThemePicker } from "@/components/theme/ThemePicker";
import { useAuth } from "@/hooks/use-auth";
import { useSiteSettings } from "@/lib/site-api";
import { useNavItems, type NavItem } from "@/lib/nav-items";
import { getNavIcon } from "@/lib/nav-icons";


function useLayout() {
  const [isBottom, setIsBottom] = useState(false);
  useEffect(() => {
    const check = () => {
      const portrait = window.matchMedia("(orientation: portrait)").matches;
      const narrow = window.innerWidth < 900;
      setIsBottom(portrait || narrow);
    };
    check();
    window.addEventListener("resize", check);
    window.addEventListener("orientationchange", check);
    return () => {
      window.removeEventListener("resize", check);
      window.removeEventListener("orientationchange", check);
    };
  }, []);
  return isBottom;
}

function Brand() {
  const { data: s } = useSiteSettings();
  const label = s?.site_title ?? "DYPOL";
  return (
    <>
      {s?.logo_url ? (
        <img src={s.logo_url} alt="" data-slot="logo" className="h-8 w-8 rounded-full object-cover border border-border" />
      ) : (
        <div data-slot="logo" className="h-8 w-8 rounded-full gradient-primary grid place-items-center text-primary-foreground font-black text-sm">
          {(label[0] ?? "D").toUpperCase()}
        </div>
      )}
      <span className="font-display font-bold text-lg tracking-tight">{label.toUpperCase()}<span className="text-primary">.</span></span>
    </>
  );
}

function AuthChip() {
  const { user, isAdmin, loading } = useAuth();
  if (loading) return null;
  if (!user) {
    return (
      <Link
        to="/auth"
        className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted transition"
      >
        <LogIn className="h-3.5 w-3.5" /> Sign in
      </Link>
    );
  }
  if (isAdmin) {
    return (
      <Link
        to="/admin"
        className="inline-flex items-center gap-1.5 rounded-full gradient-primary text-primary-foreground text-xs font-semibold px-3 py-1.5 btn-glow active:scale-95 transition"
        title="Admin"
      >
        <Shield className="h-3.5 w-3.5" /> Admin
      </Link>
    );
  }
  return null;
}

export function AppNav() {
  const isBottom = useLayout();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (pathname === "/welcome" || pathname === "/onboarding" || pathname === "/auth") return null;

  if (isBottom) return <BottomNav pathname={pathname} />;
  return <TopNav pathname={pathname} />;
}

function TopNav({ pathname }: { pathname: string }) {
  return (
    <header className="sticky top-0 z-50 w-full px-4 pt-4">
      <div className="mx-auto flex max-w-6xl items-center gap-3 rounded-full glass-strong px-3 py-2">
        <Link to="/" className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-muted/30 transition">
          <Brand />
        </Link>
        <nav className="flex-1 flex items-center justify-center gap-1">
          {NAV.map(({ to, label, icon: Icon }) => {
            const active = pathname === to || (to !== "/" && pathname.startsWith(to));
            return (
              <Link
                key={to}
                to={to}
                className="relative rounded-full px-4 py-2 text-sm font-medium transition-colors hover:text-foreground"
              >
                {active && (
                  <motion.span
                    layoutId="topnav-active"
                    className="absolute inset-0 rounded-full gradient-primary opacity-90"
                    transition={{ type: "spring", damping: 22, stiffness: 250 }}
                  />
                )}
                <span className={`relative z-10 flex items-center gap-1.5 ${active ? "text-primary-foreground" : "text-muted-foreground"}`}>
                  <Icon className="h-3.5 w-3.5" /> {label}
                </span>
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-2">
          <AuthChip />
          <ThemePicker />
        </div>
      </div>
    </header>
  );
}

function BottomNav({ pathname }: { pathname: string }) {
  return (
    <>
      <header className="sticky top-0 z-40 w-full px-4 pt-3 pb-2">
        <div className="mx-auto flex items-center justify-between rounded-full glass-strong px-3 py-2">
          <Link to="/" className="flex items-center gap-2 px-2">
            <Brand />
          </Link>
          <div className="flex items-center gap-2">
            <AuthChip />
            <ThemePicker />
          </div>
        </div>
      </header>

      <nav className="fixed bottom-3 left-3 right-3 z-50 rounded-3xl glass-strong px-2 py-2 shadow-2xl">
        <ul className="grid grid-cols-5 gap-1">
          {NAV.map(({ to, label, icon: Icon }) => {
            const active = pathname === to || (to !== "/" && pathname.startsWith(to));
            return (
              <li key={to}>
                <Link
                  to={to}
                  className="group relative flex flex-col items-center gap-0.5 rounded-2xl py-2.5 px-1 overflow-hidden active:scale-95 transition"
                >
                  {active && (
                    <motion.span
                      layoutId="bottomnav-active"
                      className="absolute inset-1 rounded-2xl gradient-primary opacity-90"
                      transition={{ type: "spring", damping: 22, stiffness: 250 }}
                    />
                  )}
                  <span className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-active:opacity-100 transition-opacity"
                    style={{ background: "radial-gradient(circle at center, rgb(255 255 255 / 0.35), transparent 60%)" }}
                  />
                  <Icon className={`relative z-10 h-5 w-5 ${active ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"}`} />
                  <span className={`relative z-10 text-[10px] font-medium ${active ? "text-primary-foreground" : "text-muted-foreground"}`}>
                    {label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div aria-hidden className="h-24" />
    </>
  );
}
