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
        className="inline-flex shrink-0 items-center gap-1 sm:gap-1.5 rounded-full border border-border/80 bg-background/60 px-2.5 sm:px-3 py-1.5 text-xs font-semibold hover:bg-muted/80 backdrop-blur-md transition"
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
        className="inline-flex shrink-0 items-center gap-1 sm:gap-1.5 rounded-full gradient-primary text-primary-foreground text-xs font-semibold px-2.5 sm:px-3 py-1.5 btn-glow active:scale-95 transition"
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
  const hidden = pathname === "/welcome" || pathname === "/onboarding" || pathname === "/auth" || pathname === "/blocked";
  const isBottom = useLayout(!hidden);
  const items = useDynamicNav();

  if (hidden) return null;

  if (isBottom) return <BottomNav pathname={pathname} items={items} />;
  return <TopNav pathname={pathname} items={items} />;
}

function TopNav({ pathname, items }: { pathname: string; items: NavItem[] }) {
  return (
    <header className="app-top-header">
      <div className="app-top-header-inner mx-auto flex max-w-6xl min-w-0 items-center gap-2 sm:gap-3 rounded-full glass-strong px-2.5 sm:px-4 py-2.5">
        <Link
          to="/"
          className="flex min-w-0 items-center gap-2 px-2 sm:px-2.5 py-1 rounded-full hover:bg-muted/30 transition shrink-0"
        >
          <Brand />
        </Link>
        <nav className="flex-1 flex items-center justify-center gap-0.5 sm:gap-1 min-w-0 overflow-x-auto scrollbar-none [mask-image:linear-gradient(to_right,transparent,black_12px,black_calc(100%-12px),transparent)] sm:[mask-image:none]">
          {items.map((item) => {
            const Icon = getNavIcon(item.icon);
            const active = !item.external && isActive(pathname, item.href);
            return (
              <NavLinkEl
                key={item.id}
                item={item}
                className="relative whitespace-nowrap rounded-full px-2.5 sm:px-3 lg:px-4 py-2 text-[13px] sm:text-sm font-medium transition-colors hover:text-foreground shrink-0"
              >
                {active && (
                  <motion.span
                    layoutId="topnav-active"
                    className="absolute inset-0 rounded-full gradient-primary opacity-95 shadow-[0_2px_10px_-2px_color-mix(in_oklab,var(--primary)_60%,transparent)]"
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
      <header className="app-top-header">
        <div className="app-top-header-inner mx-auto flex min-w-0 items-center justify-between gap-1.5 rounded-full glass-strong px-2.5 sm:px-3.5 py-2 sm:py-2.5">
          <Link to="/" className="flex min-w-0 items-center gap-1.5 sm:gap-2 pl-1 pr-2 py-0.5 shrink-0">
            <Brand />
          </Link>
          <HeaderActions />
        </div>
      </header>

      <div className="app-bottom-dock-wrap">
        <nav className="app-bottom-dock" aria-label="Primary">
          <ul
            className="grid gap-0.5"
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
          >
            {items.slice(0, 6).map((item) => {
              const Icon = getNavIcon(item.icon);
              const active = !item.external && isActive(pathname, item.href);
              return (
                <li key={item.id} className="min-w-0">
                  <NavLinkEl
                    item={item}
                    className="group relative flex flex-col items-center justify-center gap-0.5 rounded-full py-2.5 px-1 sm:px-2 min-h-[3.25rem] overflow-hidden active:scale-[0.96] transition-all duration-150 touch-manipulation"
                  >
                    {active && (
                      <motion.span
                        layoutId="bottomnav-active"
                        className="absolute inset-1 rounded-full gradient-primary opacity-95 shadow-[0_4px_14px_-4px_color-mix(in_oklab,var(--primary)_70%,transparent)]"
                        transition={{ type: "spring", damping: 22, stiffness: 250 }}
                      />
                    )}
                    <Icon
                      className={`relative z-10 h-[22px] w-[22px] shrink-0 transition-colors ${active ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground group-active:text-foreground"}`}
                    />
                    <span
                      className={`relative z-10 text-[10px] font-medium leading-none tracking-tight truncate max-w-full px-0.5 transition-colors ${active ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"}`}
                    >
                      {item.label}
                    </span>
                  </NavLinkEl>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </>
  );
}
