import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeftRight, RotateCcw, Save, Shuffle, SkipBack, SkipForward } from "lucide-react";
import {
  supportedTimezones,
  useActiveQuotes,
  useQuoteAction,
  useQuoteSettings,
  useQuotes,
  useSaveQuoteSettings,
  type QuoteSettings,
} from "@/lib/daily-quotes";
import { DEFAULT_APPEARANCE, QuoteCardView } from "@/components/quotes/QuoteCard";
import { GhostButton, Loading, NumField, SaveBar, Section, SelectField, Toggle } from "./shared";

type Form = Partial<QuoteSettings>;

export function QuoteSettingsPanel() {
  const { data: settings, isLoading } = useQuoteSettings();
  const { data: quotes = [] } = useQuotes();
  const { data: active } = useActiveQuotes();
  const save = useSaveQuoteSettings();
  const action = useQuoteAction();
  const [form, setForm] = useState<Form>({});
  const [timezones] = useState<string[]>(() => supportedTimezones());

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  const upd = <K extends keyof QuoteSettings>(k: K, v: QuoteSettings[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const previewQuotes = useMemo(() => {
    const n = Math.max(1, Math.min(Number(form.quotes_per_day) || 1, 4));
    if (active?.quotes?.length) {
      const live = active.quotes.slice(0, n);
      // pad from the library when the admin increased quotes/day beyond the live set
      if (live.length < n) {
        const extra = quotes
          .filter((q) => q.status === "active" && !live.some((l) => l.id === q.id))
          .slice(0, n - live.length)
          .map((q) => ({ id: q.id, text: q.text, author: q.author, category: q.category }));
        return [...live, ...extra];
      }
      return live;
    }
    const lib = quotes.filter((q) => q.status === "active").slice(0, n);
    if (lib.length)
      return lib.map((q) => ({ id: q.id, text: q.text, author: q.author, category: q.category }));
    return [
      {
        id: "sample",
        text: "The secret of getting ahead is getting started.",
        author: "Mark Twain",
        category: "Motivation",
      },
    ];
  }, [active?.quotes, quotes, form.quotes_per_day]);

  if (isLoading || !settings) return <Loading />;

  const runAction = async (a: "next" | "prev" | "reset" | "shuffle") => {
    try {
      await action.mutateAsync({ action: a });
      toast.success(
        a === "next"
          ? "Showing next quote"
          : a === "prev"
            ? "Showing previous quote"
            : a === "shuffle"
              ? "Quotes shuffled"
              : "Rotation reset — a fresh quote will be picked",
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    }
  };

  const onSave = async () => {
    try {
      await save.mutateAsync({
        ...form,
        quotes_per_day: Math.max(1, Math.min(Number(form.quotes_per_day) || 1, 12)),
        avoid_last_count: Math.max(0, Math.min(Number(form.avoid_last_count) || 0, 50)),
        custom_interval_minutes: Math.max(5, Number(form.custom_interval_minutes) || 360),
        animation_duration_ms: Math.max(
          50,
          Math.min(Number(form.animation_duration_ms) || 500, 5000),
        ),
        multi_interval_seconds: Math.max(3, Math.min(Number(form.multi_interval_seconds) || 8, 60)),
      });
      toast.success("Quote settings saved — live immediately");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  };

  const multi = (Number(form.quotes_per_day) || 1) > 1;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
      <div className="space-y-6">
        {/* ---------------- Manual controls ---------------- */}
        <Section
          title="Manual controls"
          hint="Override the automatic rotation — applies to every visitor instantly"
        >
          <div className="flex flex-wrap gap-2">
            <GhostButton onClick={() => runAction("prev")} disabled={action.isPending}>
              <SkipBack className="h-3.5 w-3.5" /> Show previous quote
            </GhostButton>
            <GhostButton onClick={() => runAction("next")} disabled={action.isPending}>
              <SkipForward className="h-3.5 w-3.5" /> Show next quote
            </GhostButton>
            <GhostButton onClick={() => runAction("shuffle")} disabled={action.isPending}>
              <Shuffle className="h-3.5 w-3.5" /> Shuffle quotes
            </GhostButton>
            <GhostButton
              onClick={() => {
                if (confirm("Reset the rotation cycle and anti-repeat history?"))
                  runAction("reset");
              }}
              disabled={action.isPending}
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset rotation
            </GhostButton>
          </div>
          <p className="text-[11px] text-muted-foreground">
            To lock a specific quote, open its row menu in the Quotes tab →{" "}
            <em>Set as today's quote</em> or <em>Pin as fixed quote</em>. A manual pick overrides
            the automatic selection until the period ends.
          </p>
        </Section>

        {/* ---------------- General ---------------- */}
        <Section title="General">
          <Toggle
            label="Daily quote feature"
            hint="OFF removes the card from the home screen"
            value={!!form.enabled}
            onChange={(v) => upd("enabled", v)}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <SelectField
              label="Quote visibility"
              value={(form.visibility ?? "all") as QuoteSettings["visibility"]}
              options={[
                { value: "all", label: "Everyone" },
                { value: "authenticated", label: "Signed-in users only" },
                { value: "admins", label: "Admins only (staging)" },
              ]}
              onChange={(v) => upd("visibility", v)}
            />
            <SelectField
              label="Quote display mode"
              value={(form.display_mode ?? "daily") as QuoteSettings["display_mode"]}
              options={[
                { value: "daily", label: "Daily rotation" },
                { value: "random", label: "Random daily" },
                { value: "fixed", label: "Fixed quote" },
                { value: "sequential", label: "Sequential (admin order)" },
                { value: "scheduled", label: "Scheduled windows" },
              ]}
              onChange={(v) => upd("display_mode", v)}
            />
            <SelectField
              label="Quotes per day"
              value={
                ["1", "2", "3"].includes(String(form.quotes_per_day))
                  ? String(form.quotes_per_day)
                  : "custom"
              }
              options={[
                { value: "1", label: "1 quote / day" },
                { value: "2", label: "2 quotes / day" },
                { value: "3", label: "3 quotes / day" },
                { value: "custom", label: "Custom number…" },
              ]}
              onChange={(v) => upd("quotes_per_day", v === "custom" ? 4 : Number(v))}
              hint={
                !["1", "2", "3"].includes(String(form.quotes_per_day))
                  ? `Custom: ${form.quotes_per_day} per day`
                  : undefined
              }
            />
            {multi && (
              <SelectField
                label="When showing multiple quotes"
                value={(form.multi_layout ?? "stack") as QuoteSettings["multi_layout"]}
                options={[
                  { value: "stack", label: "All together (stacked)" },
                  { value: "steps", label: "One after another (click-through)" },
                  { value: "carousel", label: "Carousel (auto + arrows)" },
                  { value: "rotate", label: "Automatic rotation (crossfade)" },
                ]}
                onChange={(v) => upd("multi_layout", v)}
              />
            )}
          </div>
          {!["1", "2", "3"].includes(String(form.quotes_per_day)) && (
            <NumField
              label="Custom quotes per day"
              value={Number(form.quotes_per_day) || 1}
              min={1}
              max={12}
              onChange={(v) => upd("quotes_per_day", v)}
            />
          )}
          {multi && (form.multi_layout === "carousel" || form.multi_layout === "rotate") && (
            <NumField
              label="Seconds between quotes"
              value={Number(form.multi_interval_seconds) || 8}
              min={3}
              max={60}
              onChange={(v) => upd("multi_interval_seconds", v)}
              hint="Auto-advance interval for carousel / automatic rotation"
            />
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <SelectField
              label="Rotation frequency"
              value={(form.rotation_frequency ?? "daily") as QuoteSettings["rotation_frequency"]}
              options={[
                { value: "daily", label: "Once per day" },
                { value: "12h", label: "Every 12 hours" },
                { value: "6h", label: "Every 6 hours" },
                { value: "3h", label: "Every 3 hours" },
                { value: "1h", label: "Every hour" },
                { value: "custom", label: "Custom interval" },
              ]}
              onChange={(v) => upd("rotation_frequency", v)}
            />
            {form.rotation_frequency === "custom" && (
              <NumField
                label="Custom interval (minutes)"
                value={Number(form.custom_interval_minutes) || 360}
                min={5}
                max={10080}
                onChange={(v) => upd("custom_interval_minutes", v)}
                hint={`= ${Math.round(((Number(form.custom_interval_minutes) || 360) / 60) * 10) / 10} hours`}
              />
            )}
          </div>
        </Section>

        {/* ---------------- Lock / fixed ---------------- */}
        <Section
          title="Single / stick quote"
          hint="Keep one quote displayed permanently until you change it"
        >
          <Toggle
            label="Lock quote (master switch)"
            hint="ON ignores rotation and always shows the selected quote"
            value={!!form.lock_quote}
            onChange={(v) => upd("lock_quote", v)}
          />
          <label className="block">
            <span className="text-xs tracking-widest text-muted-foreground">
              SELECT FIXED QUOTE
            </span>
            <select
              value={form.fixed_quote_id ?? ""}
              onChange={(e) => upd("fixed_quote_id", e.target.value || null)}
              className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary transition"
            >
              <option value="">— none selected —</option>
              {quotes.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.status === "inactive" ? "○ " : "● "}“{q.text.slice(0, 60)}
                  {q.text.length > 60 ? "…" : ""}”{q.author ? ` — ${q.author}` : ""}
                </option>
              ))}
            </select>
          </label>
          {(form.lock_quote || form.display_mode === "fixed") && !form.fixed_quote_id && (
            <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              Lock / Fixed mode is active but no fixed quote is selected — pick one above or the
              card will stay hidden.
            </p>
          )}
        </Section>

        {/* ---------------- Rotation ---------------- */}
        <Section title="Rotation & anti-repeat">
          <div className="grid gap-3 sm:grid-cols-2">
            <SelectField
              label="Selection style"
              value={(form.selection_mode ?? "random") as QuoteSettings["selection_mode"]}
              options={[
                { value: "random", label: "Random pick" },
                { value: "sequential", label: "In admin order" },
              ]}
              onChange={(v) => upd("selection_mode", v)}
              hint="How the next quote is chosen inside Daily rotation"
            />
            <NumField
              label="Avoid repeating the last…"
              value={Number(form.avoid_last_count) || 0}
              min={0}
              max={50}
              onChange={(v) => upd("avoid_last_count", v)}
              hint="…previously shown quotes (Random mode)"
            />
          </div>
          <Toggle
            label="Anti-repeat protection"
            hint="Never re-show a quote until the others have had a turn"
            value={!!form.anti_repeat}
            onChange={(v) => upd("anti_repeat", v)}
          />
          <p className="text-[11px] text-muted-foreground">
            Daily rotation cycles through every active quote once before starting a fresh cycle. The
            pick is made server-side, so all visitors always see the same quote.
          </p>
        </Section>

        {/* ---------------- Scheduling ---------------- */}
        <Section
          title="Scheduling"
          hint="Per-quote start/end windows are edited on each quote (Quotes tab → Edit)"
        >
          <Toggle
            label="Enable scheduling windows"
            hint="Quotes only appear inside their start/end window. Scheduled display mode uses windows exclusively."
            value={!!form.scheduling_enabled}
            onChange={(v) => upd("scheduling_enabled", v)}
          />
          <label className="block">
            <span className="text-xs tracking-widest text-muted-foreground">TIMEZONE</span>
            <input
              list="dypol-tz-list"
              value={form.timezone ?? "Asia/Kolkata"}
              onChange={(e) => upd("timezone", e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-primary transition"
              placeholder="IANA timezone, e.g. Asia/Kolkata"
            />
            <datalist id="dypol-tz-list">
              {timezones.map((z) => (
                <option key={z} value={z} />
              ))}
            </datalist>
          </label>
          <p className="text-[11px] text-muted-foreground">
            Day boundaries (and date/time pickers) use this timezone consistently. Unrecognised
            names fall back to UTC.
          </p>
        </Section>

        {/* ---------------- Appearance ---------------- */}
        <Section title="Appearance">
          <div className="grid gap-3 sm:grid-cols-3">
            <Toggle
              label="Author"
              value={!!form.show_author}
              onChange={(v) => upd("show_author", v)}
            />
            <Toggle
              label="Category"
              value={!!form.show_category}
              onChange={(v) => upd("show_category", v)}
            />
            <Toggle
              label="Quote icon"
              value={!!form.show_icon}
              onChange={(v) => upd("show_icon", v)}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <SelectField
              label="Card style"
              value={(form.card_style ?? "glass") as QuoteSettings["card_style"]}
              options={[
                { value: "glass", label: "Glass (default)" },
                { value: "solid", label: "Solid card" },
                { value: "outline", label: "Outline accent" },
                { value: "gradient", label: "Gradient" },
              ]}
              onChange={(v) => upd("card_style", v)}
            />
            <SelectField
              label="Text alignment"
              value={(form.text_align ?? "left") as QuoteSettings["text_align"]}
              options={[
                { value: "left", label: "Left" },
                { value: "center", label: "Center" },
              ]}
              onChange={(v) => upd("text_align", v)}
            />
          </div>
          <Toggle
            label="Quote transition animation"
            value={!!form.animation_enabled}
            onChange={(v) => upd("animation_enabled", v)}
          />
          {form.animation_enabled && (
            <div className="grid gap-3 sm:grid-cols-2">
              <SelectField
                label="Animation type"
                value={(form.animation_type ?? "fade") as QuoteSettings["animation_type"]}
                options={[
                  { value: "none", label: "None" },
                  { value: "fade", label: "Fade" },
                  { value: "slide", label: "Slide" },
                  { value: "scale", label: "Scale" },
                  { value: "blur", label: "Blur / fade" },
                ]}
                onChange={(v) => upd("animation_type", v)}
              />
              <SelectField
                label="Animation speed"
                value={(form.animation_speed ?? "normal") as QuoteSettings["animation_speed"]}
                options={[
                  { value: "slow", label: "Slow (0.9s)" },
                  { value: "normal", label: "Normal (0.5s)" },
                  { value: "fast", label: "Fast (0.25s)" },
                  { value: "custom", label: "Custom…" },
                ]}
                onChange={(v) => upd("animation_speed", v)}
              />
              {form.animation_speed === "custom" && (
                <NumField
                  label="Custom duration (ms)"
                  value={Number(form.animation_duration_ms) || 500}
                  min={50}
                  max={5000}
                  onChange={(v) => upd("animation_duration_ms", v)}
                />
              )}
            </div>
          )}
          <SaveBar pending={save.isPending} onSave={onSave} saveLabel="Save all quote settings" />
        </Section>
      </div>

      {/* ---------------- Live preview ---------------- */}
      <div className="lg:sticky lg:top-6 self-start space-y-3">
        <div className="flex items-center gap-2 text-xs tracking-widest text-muted-foreground">
          <ArrowLeftRight className="h-3.5 w-3.5" /> LIVE PREVIEW — AS SHOWN ON HOME SCREEN
        </div>
        <QuoteCardView
          quotes={previewQuotes}
          appearance={{ ...DEFAULT_APPEARANCE, ...form }}
          multiLayout={multi ? form.multi_layout : "stack"}
          multiIntervalSeconds={Number(form.multi_interval_seconds) || 8}
        />
        {active?.quotes?.length ? (
          <div className="rounded-2xl border border-border glass p-4 text-xs text-muted-foreground space-y-1">
            <div className="text-[11px] tracking-widest">CURRENTLY DISPLAYED</div>
            {active.quotes.map((q) => (
              <div key={q.id} className="font-medium text-foreground">
                “{q.text.slice(0, 70)}
                {q.text.length > 70 ? "…" : ""}”
              </div>
            ))}
            <div>
              source: <span className="font-semibold text-foreground">{active.source}</span>
              {" · "}period:{" "}
              <span className="font-semibold text-foreground">{active.period_key}</span>
            </div>
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground">
            Preview shows a sample quote until the library has quotes.
          </p>
        )}
        <p className="text-[11px] text-muted-foreground">
          The preview updates instantly as you edit — it uses the exact component rendered on the
          home screen. Changes go live for everyone only after you save.
        </p>
      </div>
    </div>
  );
}
