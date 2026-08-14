import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowRight, Loader2, Lock } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { DioCostBadge, DioStar } from "@/components/dio/DioBits";
import { useUnlockItem, useUnlockedSet, type ItemKind, unlockKey } from "@/lib/dio";

/**
 * Access button with Dio gating. The server is the only authority:
 * cost, balance, unlock status and the debit all happen inside one
 * atomic database operation (`dio_unlock`).
 *
 * `withBadge={false}` renders only the button (used inside structured
 * card footers that render their own status badge).
 */
export function AccessButton({
  kind,
  itemId,
  cost,
  link,
  label,
  icon,
  withBadge = true,
}: {
  kind: ItemKind;
  itemId: string;
  cost: number;
  link: string;
  label: string;
  icon?: React.ReactNode;
  withBadge?: boolean;
}) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { set } = useUnlockedSet(user?.id);
  const unlock = useUnlockItem(user?.id);
  const [busy, setBusy] = useState(false);

  const unlocked = set.has(unlockKey(kind, itemId));
  const base =
    "flex-1 min-w-0 inline-flex items-center justify-center gap-2 rounded-full gradient-primary text-primary-foreground min-h-10 px-3 py-2 font-semibold btn-glow hover:opacity-95 active:scale-95 transition";

  if (!link) {
    return (
      <>
        <button disabled title="Link coming soon" className={`${base} cursor-not-allowed opacity-70`}>
          <Lock className="h-3.5 w-3.5 shrink-0" /> {label} {icon ?? <ArrowRight className="h-4 w-4 shrink-0" />}
        </button>
        {withBadge && <DioCostBadge cost={cost} unlocked={unlocked} />}
      </>
    );
  }

  const openLink = () => window.open(link, "_blank", "noopener,noreferrer");

  const onClick = async () => {
    if (loading || busy) return;
    if (!user) {
      toast.info("Create a free account to open resources.");
      navigate({ to: "/auth" });
      return;
    }
    if (unlocked || cost === 0) {
      openLink();
      return;
    }
    setBusy(true);
    try {
      const res = await unlock.mutateAsync({ kind, id: itemId });
      if (res.ok) {
        openLink();
        if (!res.already) toast.success(`Unlocked for ${cost} Dio.`);
        return;
      }
      if (res.error === "ACCOUNT_BLOCKED") {
        toast.error("Your account is blocked. Contact support for help.");
        navigate({ to: "/blocked", replace: true });
        return;
      }
      if (res.error === "ONBOARDING_REQUIRED") {
        toast.info("Pick your exam and year first — it takes ten seconds.");
        navigate({ to: "/onboarding", replace: true });
        return;
      }
      if (res.error === "INSUFFICIENT_DIO") {
        toast.error(`You need ${res.needed} more Dio to unlock this.`, {
          action: { label: "Earn Dio", onClick: () => navigate({ to: "/earnDio" }) },
        });
        return;
      }
      if (res.error === "AUTH_REQUIRED") {
        navigate({ to: "/auth" });
        return;
      }
      toast.error("Couldn't unlock this right now.");
    } catch (e) {
      // Network/timeout: never guess — the server balance is refetched by the mutation.
      toast.error(e instanceof Error ? e.message : "Something went wrong. Your Dio is unchanged.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button onClick={onClick} disabled={busy} className={`${base} disabled:opacity-70`}>
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin shrink-0" />
        ) : !user || unlocked || cost === 0 ? null : (
          <DioStar className="text-xs shrink-0" />
        )}
        <span className="truncate">{label}</span> {icon ?? <ArrowRight className="h-4 w-4 shrink-0" />}
      </button>
      {withBadge && <DioCostBadge cost={cost} unlocked={unlocked} />}
    </>
  );
}
