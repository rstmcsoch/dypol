import { motion, AnimatePresence } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useDioBalance, formatDio } from "@/lib/dio";

/** Golden Dio star — the currency's iconography. */
export function DioStar({ className = "text-[11px]" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-block leading-none text-[#e8b23a] drop-shadow-[0_0_4px_rgba(232,178,58,0.35)] ${className}`}
    >
      ✦
    </span>
  );
}

/** Top-right Dio balance chip. Guests see ✦ 0 Dio and are sent to sign-up. */
export function DioBalance({ compact = false }: { compact?: boolean }) {
  const { user, loading } = useAuth();
  const { data: balance } = useDioBalance(user?.id);
  const value = user ? (balance ?? 0) : 0;

  if (loading) return null;

  return (
    <Link
      to={user ? "/earnDio" : "/auth"}
      title={user ? "Your Dio — tap to earn more" : "Sign up to start earning Dio"}
      className="inline-flex items-center gap-1.5 rounded-full border border-[#e8b23a]/35 bg-[#e8b23a]/10 px-3 py-1.5 text-xs transition hover:border-[#e8b23a]/70 hover:bg-[#e8b23a]/15 active:scale-95"
    >
      <DioStar className="text-sm" />
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={{ y: -6, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 6, opacity: 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="tabular-nums font-semibold"
        >
          {formatDio(value)}
        </motion.span>
      </AnimatePresence>
      {!compact && <span className="font-medium text-muted-foreground">Dio</span>}
    </Link>
  );
}

/** Small circular Dio-cost indicator shown beside access buttons. */
export function DioCostBadge({ cost, unlocked }: { cost: number; unlocked?: boolean }) {
  if (unlocked) {
    return (
      <span
        title="Already unlocked"
        className="inline-flex h-10 shrink-0 items-center gap-1 rounded-full border border-[#e8b23a]/40 bg-[#e8b23a]/10 px-3 text-[10px] font-bold text-[#e8b23a]"
      >
        <DioStar /> Unlocked
      </span>
    );
  }
  if (!cost) {
    return (
      <span
        title="Free"
        className="inline-flex h-10 shrink-0 items-center rounded-full border border-border px-3 text-[10px] font-bold text-muted-foreground"
      >
        Free
      </span>
    );
  }
  return (
    <span
      title={`Costs ${cost} Dio`}
      className="inline-flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-full border border-[#e8b23a]/40 bg-[#e8b23a]/10 text-[11px] font-bold leading-none text-[#e8b23a]"
    >
      <DioStar className="text-[9px]" />
      <span className="tabular-nums">{cost}</span>
    </span>
  );
}
