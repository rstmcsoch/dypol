import { useState } from "react";
import { BarChart3, ClipboardList, Hourglass, Megaphone, Users } from "lucide-react";
import type { DioAdminUser } from "@/lib/dio";
import { DioOverviewPanel } from "./DioOverviewPanel";
import { DioUsersPanel } from "./DioUsersPanel";
import { DioTxPanel } from "./DioTxPanel";
import { DioAdsPanel } from "./DioAdsPanel";
import { DioReviewPanel } from "./DioReviewPanel";

type DioSubTab = "overview" | "users" | "transactions" | "ads" | "review";

const SUB_TABS: { k: DioSubTab; label: string; icon: typeof Users }[] = [
  { k: "overview", label: "Overview", icon: BarChart3 },
  { k: "users", label: "Users", icon: Users },
  { k: "transactions", label: "Transactions", icon: ClipboardList },
  { k: "ads", label: "EarnDio Ads", icon: Megaphone },
  { k: "review", label: "Review", icon: Hourglass },
];

export function DioTab() {
  const [sub, setSub] = useState<DioSubTab>("overview");
  const [txUserFilter, setTxUserFilter] = useState<DioAdminUser | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex gap-1 overflow-x-auto rounded-2xl border border-border glass p-1">
        {SUB_TABS.map((t) => {
          const active = sub === t.k;
          const Icon = t.icon;
          return (
            <button
              key={t.k}
              onClick={() => setSub(t.k)}
              className={`flex-1 min-w-[110px] inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                active
                  ? "bg-[#e8b23a]/15 text-[#e8b23a] border border-[#e8b23a]/40"
                  : "hover:bg-muted border border-transparent"
              }`}
            >
              <Icon className="h-4 w-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {sub === "overview" && <DioOverviewPanel onGoReview={() => setSub("review")} />}
      {sub === "users" && (
        <DioUsersPanel
          onViewTransactions={(u) => {
            setTxUserFilter(u);
            setSub("transactions");
          }}
        />
      )}
      {sub === "transactions" && (
        <DioTxPanel userFilter={txUserFilter} onClearUserFilter={() => setTxUserFilter(null)} />
      )}
      {sub === "ads" && <DioAdsPanel />}
      {sub === "review" && <DioReviewPanel />}
    </div>
  );
}
