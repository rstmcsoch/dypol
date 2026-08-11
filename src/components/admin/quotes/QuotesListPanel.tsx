import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowUp,
  CalendarCheck,
  Copy,
  Eye,
  MoreVertical,
  Pin,
  PinOff,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  formatInTz,
  safeTimezone,
  useDeleteQuote,
  useQuoteAction,
  useQuoteSettings,
  useQuotes,
  useSaveQuote,
  utcIsoToZonedWall,
  zonedWallToUtcIso,
  type Quote,
} from "@/lib/daily-quotes";
import { QuoteCardView } from "@/components/quotes/QuoteCard";
import { Loading, Modal, PrimaryButton, SaveBar, SelectField, TextArea, TextField } from "./shared";

export function QuotesListPanel({ onPreview }: { onPreview: (q: Quote) => void }) {
  const { data: quotes = [], isLoading } = useQuotes();
  const { data: settings } = useQuoteSettings();
  const save = useSaveQuote();
  const del = useDeleteQuote();
  const action = useQuoteAction();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [editing, setEditing] = useState<Partial<Quote> | null>(null);

  const tz = safeTimezone(settings?.timezone);

  const categories = useMemo(
    () => [...new Set(quotes.map((q) => q.category).filter(Boolean))].sort(),
    [quotes],
  );

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return quotes.filter((q) => {
      if (statusFilter !== "all" && q.status !== statusFilter) return false;
      if (categoryFilter !== "all" && q.category !== categoryFilter) return false;
      if (needle && !`${q.text} ${q.author} ${q.category}`.toLowerCase().includes(needle))
        return false;
      return true;
    });
  }, [quotes, search, statusFilter, categoryFilter]);

  if (isLoading) return <Loading />;

  const runAction = async (a: "set_today" | "set_fixed", quoteId: string | null) => {
    try {
      await action.mutateAsync({ action: a, quoteId });
      toast.success(
        a === "set_today"
          ? "Set as today's quote"
          : a === "set_fixed"
            ? "Pinned as fixed quote"
            : "Done",
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    }
  };

  const duplicate = async (q: Quote) => {
    try {
      await save.mutateAsync({
        text: q.text,
        author: q.author,
        category: q.category,
        status: "inactive",
        sort_order: q.sort_order + 1,
        start_at: q.start_at,
        end_at: q.end_at,
      });
      toast.success("Duplicated (created as inactive)");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Duplicate failed");
    }
  };

  const move = async (q: Quote, dir: -1 | 1) => {
    const idx = quotes.findIndex((x) => x.id === q.id);
    const j = idx + dir;
    if (j < 0 || j >= quotes.length) return;
    const other = quotes[j]!;
    try {
      await save.mutateAsync({ id: q.id, sort_order: other.sort_order });
      await save.mutateAsync({ id: other.id, sort_order: q.sort_order });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Reorder failed");
    }
  };

  const toggleStatus = async (q: Quote) => {
    try {
      await save.mutateAsync({ id: q.id, status: q.status === "active" ? "inactive" : "active" });
      toast.success(
        q.status === "active" ? "Quote disabled — removed from rotation" : "Quote enabled",
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  };

  const isFixed = (q: Quote) => settings?.fixed_quote_id === q.id;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search quotes, authors, categories…"
            className="w-full rounded-xl border border-border bg-transparent pl-9 pr-3 py-2 text-sm outline-none focus:border-primary transition"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary transition"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary transition"
        >
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <PrimaryButton
          onClick={() =>
            setEditing({
              text: "",
              author: "",
              category: "",
              status: "active",
              sort_order: (quotes.at(-1)?.sort_order ?? 0) + 10,
              start_at: null,
              end_at: null,
            })
          }
        >
          <Plus className="h-4 w-4" /> Add quote
        </PrimaryButton>
      </div>

      <div className="text-xs text-muted-foreground">
        {filtered.length} of {quotes.length} quotes
        {settings?.lock_quote && (
          <span className="ml-2 rounded-full bg-primary/10 text-primary px-2 py-0.5 font-semibold">
            LOCK ACTIVE
          </span>
        )}
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border glass overflow-x-auto">
        <table className="w-full text-sm min-w-[760px]">
          <thead className="bg-muted/50 text-xs text-muted-foreground uppercase tracking-widest">
            <tr>
              <th className="text-left p-3">Quote</th>
              <th className="text-left p-3 hidden lg:table-cell">Category</th>
              <th className="text-left p-3 hidden xl:table-cell">Window</th>
              <th className="text-left p-3 hidden md:table-cell">Shown</th>
              <th className="text-left p-3">Status</th>
              <th className="text-right p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((q) => (
              <tr key={q.id} className="border-t border-border hover:bg-muted/30">
                <td className="p-3 max-w-[340px]">
                  <div className="font-medium line-clamp-2">“{q.text}”</div>
                  <div className="mt-0.5 text-xs text-muted-foreground flex flex-wrap items-center gap-2">
                    {q.author && <span>— {q.author}</span>}
                    <span className="text-[10px]">order {q.sort_order}</span>
                    {isFixed(q) && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-1.5 py-0.5 text-[10px] font-semibold">
                        <Pin className="h-2.5 w-2.5" /> FIXED
                      </span>
                    )}
                  </div>
                </td>
                <td className="p-3 hidden lg:table-cell">
                  {q.category ? (
                    <span className="rounded-full bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 text-[11px] font-semibold">
                      {q.category}
                    </span>
                  ) : (
                    <span className="text-muted-foreground italic">—</span>
                  )}
                </td>
                <td className="p-3 hidden xl:table-cell text-xs text-muted-foreground">
                  {q.start_at || q.end_at ? (
                    <div className="space-y-0.5">
                      {q.start_at && <div>from {formatInTz(q.start_at, tz)}</div>}
                      {q.end_at && <div>until {formatInTz(q.end_at, tz)}</div>}
                    </div>
                  ) : (
                    <span className="italic">always</span>
                  )}
                </td>
                <td className="p-3 hidden md:table-cell text-xs text-muted-foreground">
                  <div className="font-semibold text-foreground tabular-nums">
                    {q.display_count}×
                  </div>
                  <div>{q.last_displayed_at ? formatInTz(q.last_displayed_at, tz) : "never"}</div>
                </td>
                <td className="p-3">
                  <button
                    onClick={() => toggleStatus(q)}
                    title={q.status === "active" ? "Disable quote" : "Enable quote"}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full p-0.5 transition ${q.status === "active" ? "gradient-primary" : "bg-muted"}`}
                  >
                    <span
                      className={`block h-4 w-4 rounded-full bg-background transition-transform ${q.status === "active" ? "translate-x-4" : ""}`}
                    />
                  </button>
                </td>
                <td className="p-3">
                  <div className="flex items-center justify-end gap-0.5">
                    <IconBtn title="Move up" onClick={() => move(q, -1)}>
                      <ArrowUp className="h-4 w-4" />
                    </IconBtn>
                    <IconBtn title="Move down" onClick={() => move(q, 1)}>
                      <ArrowDown className="h-4 w-4" />
                    </IconBtn>
                    <IconBtn title="Preview on home screen" onClick={() => onPreview(q)}>
                      <Eye className="h-4 w-4" />
                    </IconBtn>
                    <button
                      onClick={() => setEditing(q)}
                      className="rounded-lg px-2.5 py-1.5 text-xs font-semibold hover:bg-primary/10 hover:text-primary transition"
                    >
                      Edit
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          className="grid h-8 w-8 place-items-center rounded-lg hover:bg-muted"
                          title="More actions"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="glass-strong border-border rounded-xl"
                      >
                        <DropdownMenuItem
                          onClick={() => runAction("set_today", q.id)}
                          className="gap-2 cursor-pointer"
                        >
                          <CalendarCheck className="h-4 w-4" /> Set as today's quote
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => runAction("set_fixed", q.id)}
                          className="gap-2 cursor-pointer"
                        >
                          <Pin className="h-4 w-4" /> Pin as fixed quote
                        </DropdownMenuItem>
                        {isFixed(q) && (
                          <DropdownMenuItem
                            onClick={() => runAction("set_fixed", null)}
                            className="gap-2 cursor-pointer"
                          >
                            <PinOff className="h-4 w-4" /> Unpin fixed quote
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => duplicate(q)}
                          className="gap-2 cursor-pointer"
                        >
                          <Copy className="h-4 w-4" /> Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={async () => {
                            if (
                              !confirm(
                                `Delete this quote?\n\n“${q.text.slice(0, 80)}${q.text.length > 80 ? "…" : ""}”`,
                              )
                            )
                              return;
                            try {
                              await del.mutateAsync(q.id);
                              toast.success("Deleted — removed from rotation immediately");
                            } catch (e) {
                              toast.error(e instanceof Error ? e.message : "Delete failed");
                            }
                          }}
                          className="gap-2 cursor-pointer text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </td>
              </tr>
            ))}
            {!filtered.length && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-sm text-muted-foreground">
                  No quotes match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <QuoteEditModal
          quote={editing}
          tz={tz}
          pending={save.isPending}
          onClose={() => setEditing(null)}
          onSave={async (draft) => {
            if (!draft.text?.trim()) {
              toast.error("Quote text is required");
              return;
            }
            if (
              draft.start_at &&
              draft.end_at &&
              new Date(draft.end_at) <= new Date(draft.start_at)
            ) {
              toast.error("End must be after the start");
              return;
            }
            try {
              await save.mutateAsync(draft);
              toast.success("Saved");
              setEditing(null);
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Save failed");
            }
          }}
        />
      )}
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="grid h-8 w-8 place-items-center rounded-lg hover:bg-muted transition"
    >
      {children}
    </button>
  );
}

/* ------------------------------ Edit modal ------------------------------ */

function QuoteEditModal({
  quote,
  tz,
  pending,
  onClose,
  onSave,
}: {
  quote: Partial<Quote>;
  tz: string;
  pending: boolean;
  onClose: () => void;
  onSave: (draft: Partial<Quote>) => void;
}) {
  const [draft, setDraft] = useState<Partial<Quote>>(quote);
  const upd = <K extends keyof Quote>(k: K, v: Quote[K] | null) =>
    setDraft((d) => ({ ...d, [k]: v }));

  return (
    <Modal title={quote.id ? "Edit quote" : "New quote"} onClose={onClose}>
      <div className="grid gap-3">
        <TextArea
          label="Quote text (required)"
          value={draft.text ?? ""}
          onChange={(v) => upd("text", v)}
          placeholder="The quote as it will appear on the home screen"
          rows={3}
        />
        <div className="grid grid-cols-2 gap-2">
          <TextField
            label="Author (optional)"
            value={draft.author ?? ""}
            onChange={(v) => upd("author", v)}
            placeholder="e.g. Seneca"
          />
          <TextField
            label="Category / tag (optional)"
            value={draft.category ?? ""}
            onChange={(v) => upd("category", v)}
            placeholder="e.g. Motivation"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <SelectField
            label="Status"
            value={(draft.status ?? "active") as "active" | "inactive"}
            options={[
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
            ]}
            onChange={(v) => upd("status", v)}
          />
          <TextField
            label="Sort order (smaller = earlier)"
            value={String(draft.sort_order ?? 100)}
            onChange={(v) => upd("sort_order", Number(v) || 0)}
            type="number"
          />
        </div>
        <div className="rounded-xl border border-border p-3">
          <div className="text-xs tracking-widest text-muted-foreground">
            SCHEDULED WINDOW (OPTIONAL · {tz})
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <label className="block">
              <span className="text-[11px] text-muted-foreground">Starts at</span>
              <input
                type="datetime-local"
                value={utcIsoToZonedWall(draft.start_at, tz)}
                onChange={(e) => upd("start_at", zonedWallToUtcIso(e.target.value, tz))}
                className="mt-1 w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-primary transition"
              />
            </label>
            <label className="block">
              <span className="text-[11px] text-muted-foreground">Ends at</span>
              <input
                type="datetime-local"
                value={utcIsoToZonedWall(draft.end_at, tz)}
                onChange={(e) => upd("end_at", zonedWallToUtcIso(e.target.value, tz))}
                className="mt-1 w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-primary transition"
              />
            </label>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Windows apply when scheduling is enabled (or Scheduled mode is selected). Clear both
            fields for a quote that's always eligible.
          </p>
          {(draft.start_at || draft.end_at) && (
            <button
              onClick={() => setDraft((d) => ({ ...d, start_at: null, end_at: null }))}
              className="mt-1 text-[11px] font-semibold text-muted-foreground hover:text-destructive transition"
            >
              Clear window
            </button>
          )}
        </div>

        {/* Inline preview */}
        {draft.text?.trim() ? (
          <div>
            <div className="text-xs tracking-widest text-muted-foreground mb-1.5">PREVIEW</div>
            <QuoteCardView
              quotes={[
                {
                  id: "preview",
                  text: draft.text,
                  author: draft.author ?? "",
                  category: draft.category ?? "",
                },
              ]}
            />
          </div>
        ) : null}
      </div>
      <SaveBar pending={pending} onCancel={onClose} onSave={() => onSave(draft)} />
    </Modal>
  );
}
