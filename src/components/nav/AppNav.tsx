import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shield, LogIn } from "lucide-react";
import { motion } from "framer-motion";
import { ThemePicker } from "@/components/theme/ThemePicker";
import { useAuth } from "@/hooks/use-auth";
import { useSiteSettings } from "@/lib/site-api";
import { useNavItems, type NavItem } from "@/lib/nav-items";
import { getNavIcon } from "@/lib/nav-icons";
import { DioBalance } from "@/components/dio/DioBits";

function useLayout(enabled: boolean) {
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

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.nav = !enabled ? "none" : isBottom ? "bottom" : "top";
    return () => {
      delete root.dataset.nav;
    };
  }, [isBottom, enabled]);

  return isBottom;
}

function Brand() {
  const { data: s } = useSiteSettings();
  const label = s?.site_title ?? "DYPOL";
  return (
    <>
      {s?.logo_url ? (
        <img
          src={s.logo_url}
          alt=""
          data-slot="logo"
          className="h-7 w-7 sm:h-8 sm:w-8 shrink-0 rounded-full object-cover border border-border"
        />
      ) : (
        <div
          data-slot="logo"
          className="h-7 w-7 sm:h-8 sm:w-8 shrink-0 rounded-full gradient-primary grid place-items-center text-primary-foreground font-black text-sm"
        >
          {(label[0] ?? "D").toUpperCase()}
        </div>
      )}
      <span className="font-display font-bold text-[0.95rem] sm:text-lg tracking-tight truncate">
        {label.toUpperCase()}
        <span className="text-primary">.</span>
      </span>
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
        className="inline-flex shrink-0 items-center gap-1 sm:gap-1.5 rounded-full border border-border px-2.5 sm:px-3 py-1.5 text-xs font-semibold hover:bg-muted transition"
      >
        <LogIn className="h-3.5 w-3.5" />
        <span>Sign in</span>
      </Link>
    );
  }
  if (isAdmin) {
    return (
      <Link
        to="/admin"
        className="inline-flex shrink-0 items-center gap-1 sm:gap-1.5 rounded-full gradient-primary text-primary-foreground text-xs font-semibold px-2 sm:px-3 py-1.5 btn-glow active:scale-95 transition"
        title="Admin"
      >
        <Shield className="h-3.5 w-3.5" />
        <span className="hidden min-[380px]:inline">Admin</span>
      </Link>
    );
  }
  return null;
}

function HeaderActions() {
  const { user, loading } = useAuth();
  return (
    <div className="flex min-w-0 shrink-0 items-center gap-1 sm:gap-1.5">
      {!loading && user ? <DioBalance compact /> : null}
      <AuthChip />
      <ThemePicker />
    </div>
  );
}

function useDynamicNav(): NavItem[] {
  const { data } = useNavItems();
  return (data ?? []).filter((n) => n.enabled);
}

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

function NavLinkEl({
  item,
  className,
  children,
}: {
  item: NavItem;
  className?: string;
  children: React.ReactNode;
}) {
  if (item.external || /^https?:\/\//i.test(item.href)) {
    return (
      <a href={item.href} target="_blank" rel="noopener noreferrer" className={className}>
        {children}
      </a>
    );
  }
  return (
    // Cast lets admins add any internal route path without TS route-tree constraints.
    <Link to={item.href as unknown as "/"} className={className}>
      {children}
    </Link>
  );
}

export function AppNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const hidden = pathname === "/welcome" || pathname === "/onboarding" || pathname === "/auth";
  const isBottom = useLayout(!hidden);
  const items = useDynamicNav();

  if (hidden) return null;

  if (isBottom) return <BottomNav pathname={pathname} items={items} />;
  return <TopNav pathname={pathname} items={items} />;
}

function TopNav({ pathname, items }: { pathname: string; items: NavItem[] }) {
  return (
    <header className="app-top-header sticky top-0 z-50 w-full">
      <div className="mx-auto flex max-w-6xl min-w-0 items-center gap-2 sm:gap-3 rounded-full glass-strong px-2 sm:px-3 py-2">
        <Link
          to="/"
          className="flex min-w-0 items-center gap-2 px-2 sm:px-3 py-1.5 rounded-full hover:bg-muted/30 transition"
        >
          <Brand />
        </Link>
        <nav className="flex-1 flex items-center justify-center gap-1 flex-wrap min-w-0">
          {items.map((item) => {
            const Icon = getNavIcon(item.icon);
            const active = !item.external && isActive(pathname, item.href);
            return (
              <NavLinkEl
                key={item.id}
                item={item}
                className="relative rounded-full px-3 lg:px-4 py-2 text-sm font-medium transition-colors hover:text-foreground"
              >
                {active && (
                  <motion.span
                    layoutId="topnav-active"
                    className="absolute inset-0 rounded-full gradient-primary opacity-90"
                    transition={{ type: "spring", damping: 22, stiffness: 250 }}
                  />
                )}
                <span
                  className={`relative z-10 flex items-center gap-1.5 ${active ? "text-primary-foreground" : "text-muted-foreground"}`}
                >
                  <Icon className="h-3.5 w-3.5" /> {item.label}
                </span>
              </NavLinkEl>
            );
          })}
        </nav>
        <HeaderActions />
      </div>
    </header>
  );
}

function BottomNav({ pathname, items }: { pathname: string; items: NavItem[] }) {
  const cols = Math.min(Math.max(items.length, 1), 6);
  return (
    <>
      <header className="app-top-header sticky top-0 z-40 w-full">
        <div className="mx-auto flex min-w-0 items-center justify-between gap-1.5 rounded-full glass-strong px-2 sm:px-3 py-1.5 sm:py-2">
          <Link to="/" className="flex min-w-0 items-center gap-1.5 sm:gap-2 px-1 sm:px-2">
            <Brand />
          </Link>
          <HeaderActions />
        </div>
      </header>

      <nav className="app-bottom-nav" aria-label="Primary">
        <ul
          className="grid gap-0.5 px-1"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {items.slice(0, 6).map((item) => {
            const Icon = getNavIcon(item.icon);
            const active = !item.external && isActive(pathname, item.href);
            return (
              <li key={item.id} className="min-w-0">
                <NavLinkEl
                  item={item}
                  className="group relative flex flex-col items-center gap-0.5 rounded-2xl py-2 px-0.5 overflow-hidden active:scale-95 transition touch-manipulation"
                >
                  {active && (
                    <motion.span
                      layoutId="bottomnav-active"
                      className="absolute inset-1 rounded-2xl gradient-primary opacity-90"
                      transition={{ type: "spring", damping: 22, stiffness: 250 }}
                    />
                  )}
                  <Icon
                    className={`relative z-10 h-5 w-5 shrink-0 ${active ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"}`}
                  />
                  <span
                    className={`relative z-10 text-[10px] font-medium truncate max-w-full px-0.5 ${active ? "text-primary-foreground" : "text-muted-foreground"}`}
                  >
                    {item.label}
                  </span>
                </NavLinkEl>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
