import { useState } from "react";
import { BarChart3, CalendarDays, DatabaseBackup, List, Settings2 } from "lucide-react";
import { useQuotes, useQuoteSettings, type Quote } from "@/lib/daily-quotes";
import { QuoteCardView } from "@/components/quotes/QuoteCard";
import { QuotesListPanel } from "./QuotesListPanel";
import { QuoteSettingsPanel } from "./QuoteSettingsPanel";
import { QuoteSchedulePanel } from "./QuoteSchedulePanel";
import { QuoteStatsPanel } from "./QuoteStatsPanel";
import { Modal } from "./shared";

type Sub = "quotes" | "settings" | "schedule" | "stats";

const SUBS: { k: Sub; label: string; icon: typeof List }[] = [
  { k: "quotes", label: "Quotes", icon: List },
  { k: "settings", label: "Settings & preview", icon: Settings2 },
  { k: "schedule", label: "Schedule", icon: CalendarDays },
  { k: "stats", label: "Statistics", icon: BarChart3 },
];

export function QuotesTab() {
  const [sub, setSub] = useState<Sub>("quotes");
  const [preview, setPreview] = useState<Quote | null>(null);
  const settingsQ = useQuoteSettings();
  const quotesQ = useQuotes();
  const settings = settingsQ.data;

  const missingMsg = (e: unknown) =>
    /does not exist|relation|schema cache|Could not find/i.test(String((e as Error)?.message));
  const dbMissing =
    (settingsQ.isError && missingMsg(settingsQ.error)) ||
    (quotesQ.isError && missingMsg(quotesQ.error));

  if (dbMissing) {
    return (
      <div className="rounded-3xl border border-border glass p-8 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
          <DatabaseBackup className="h-6 w-6" />
        </div>
        <h2 className="mt-4 font-display text-2xl font-black">Database migration pending</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          The Daily Quote tables don't exist in Supabase yet. Apply
          <code className="mx-1 rounded bg-muted px-1.5 py-0.5">
            supabase/migrations/20260811120000_daily_quotes.sql
          </code>
          (it runs automatically with your normal Lovable/Supabase deploy), then reload this page.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex gap-1 rounded-2xl border border-border glass p-1 overflow-x-auto">
        {SUBS.map((t) => {
          const Icon = t.icon;
          const active = sub === t.k;
          return (
            <button
              key={t.k}
              onClick={() => setSub(t.k)}
              className={`flex-1 min-w-[120px] inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                active ? "gradient-primary text-primary-foreground btn-glow" : "hover:bg-muted"
              }`}
            >
              <Icon className="h-4 w-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {sub === "quotes" && <QuotesListPanel onPreview={setPreview} />}
      {sub === "settings" && <QuoteSettingsPanel />}
      {sub === "schedule" && <QuoteSchedulePanel />}
      {sub === "stats" && <QuoteStatsPanel />}

      {/* “Preview on Home Screen” — renders the exact production card */}
      {preview && (
        <Modal title="Preview on home screen" onClose={() => setPreview(null)} wide>
          <p className="mb-3 text-xs text-muted-foreground">
            Exactly as visitors will see it with the current appearance settings:
          </p>
          <QuoteCardView
            quotes={[
              {
                id: preview.id,
                text: preview.text,
                author: preview.author,
                category: preview.category,
              },
            ]}
            appearance={settings}
          />
          <div className="mt-4 grid gap-2 text-xs text-muted-foreground">
            <div className="flex justify-between rounded-xl border border-border px-3 py-2">
              <span>Status</span>
              <span className="font-semibold text-foreground">{preview.status}</span>
            </div>
            <div className="flex justify-between rounded-xl border border-border px-3 py-2">
              <span>Times displayed</span>
              <span className="font-semibold text-foreground">{preview.display_count}×</span>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
