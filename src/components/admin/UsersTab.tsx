import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Search, X, Loader2, ChevronLeft, ChevronRight, Eye, Ban, Undo2, Clock,
  ArrowUp, ArrowDown, ArrowUpDown, Users, RotateCcw, ShieldOff, CalendarClock,
} from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { useExams } from "@/lib/taxonomy";
import {
  useAdminUsers, useAdminUserProfile,
  formatActiveTime, formatDuration, timeAgo,
  type AdminUserRow, type UserSort, type UserStatusFilter,
} from "@/lib/admin-users";
import { adminSetBlock, type BlockAction } from "@/lib/account";

const PAGE_SIZE = 20;
const MIN_APPROVED_OPTIONS = [
  { value: null, label: "Any approved" },
  { value: 1, label: "Approved ≥ 1" },
  { value: 5, label: "Approved ≥ 5" },
  { value: 10, label: "Approved ≥ 10" },
  { value: 25, label: "Approved ≥ 25" },
  { value: 50, label: "Approved ≥ 50" },
];

const SORT_OPTIONS: { value: UserSort; label: string }[] = [
  { value: "newest", label: "Newest registered" },
  { value: "oldest", label: "Oldest registered" },
  { value: "approved_desc", label: "Contribution: high → low (approved)" },
  { value: "approved_asc", label: "Contribution: low → high (approved)" },
  { value: "total_desc", label: "Contribution: high → low (total)" },
  { value: "total_asc", label: "Contribution: low → high (total)" },
  { value: "active_desc", label: "Active time: highest" },
  { value: "active_asc", label: "Active time: lowest" },
  { value: "sessions_desc", label: "Sessions: most" },
  { value: "sessions_asc", label: "Sessions: fewest" },
  { value: "recent", label: "Most recently active" },
  { value: "stale", label: "Least recently active" },
];

function statusInfo(u: AdminUserRow): { label: string; cls: string } {
  if (u.is_blocked) {
    if (u.account_status === "blocked") {
      return { label: "Blocked", cls: "bg-destructive/10 text-destructive border-destructive/40" };
    }
    return { label: "Temp block", cls: "bg-[#e8b23a]/10 text-[#e8b23a] border-[#e8b23a]/40" };
  }
  if (u.needs_onboarding) {
    return { label: "Onboarding", cls: "bg-muted text-muted-foreground border-border" };
  }
  return { label: "Active", cls: "bg-primary/10 text-primary border-primary/40" };
}

export default function UsersTab() {
  const qc = useQueryClient();
  const exams = useExams();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [exam, setExam] = useState("");
  const [status, setStatus] = useState<UserStatusFilter>("");
  const [sort, setSort] = useState<UserSort>("newest");
  const [minApproved, setMinApproved] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [viewingId, setViewingId] = useState<string | null>(null);

  // Debounced search — never fires a query per keystroke.
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const query = useAdminUsers({
    search: debouncedSearch,
    exam,
    status,
    sort,
    minApproved,
    page,
    pageSize: PAGE_SIZE,
  });

  const examNameOf = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of exams.data ?? []) map.set(e.slug, e.name);
    return (slug: string | null) => (slug ? map.get(slug) ?? slug : "—");
  }, [exams.data]);

  const resetAll = () => {
    setSearch("");
    setDebouncedSearch("");
    setExam("");
    setStatus("");
    setSort("newest");
    setMinApproved(null);
    setPage(1);
  };

  const removeFilter = (key: "search" | "exam" | "status" | "minApproved" | "sort") => {
    if (key === "search") { setSearch(""); setDebouncedSearch(""); }
    if (key === "exam") setExam("");
    if (key === "status") setStatus("");
    if (key === "minApproved") setMinApproved(null);
    if (key === "sort") setSort("newest");
    setPage(1);
  };

  const activeFilterCount =
    (debouncedSearch ? 1 : 0) + (exam ? 1 : 0) + (status ? 1 : 0) + (minApproved !== null ? 1 : 0) + (sort !== "newest" ? 1 : 0);

  const users = query.data?.users ?? [];
  const total = query.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const toggleContribution = () =>
    setSort(sort === "approved_desc" ? "approved_asc" : sort === "approved_asc" ? "total_desc" : sort === "total_desc" ? "total_asc" : "approved_desc");
  const toggleActivity = () =>
    setSort(sort === "active_desc" ? "active_asc" : sort === "active_asc" ? "sessions_desc" : sort === "sessions_desc" ? "sessions_asc" : "active_desc");
  const toggleJoined = () => setSort(sort === "newest" ? "oldest" : "newest");
  const toggleLastActive = () => setSort(sort === "recent" ? "stale" : "recent");

  const SortIndicator = ({ active, dir }: { active: boolean; dir?: "asc" | "desc" }) => {
    if (!active) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return dir === "asc" ? <ArrowUp className="h-3 w-3 text-primary" /> : <ArrowDown className="h-3 w-3 text-primary" />;
  };

  const contributionsSortActive =
    sort === "approved_desc" || sort === "approved_asc" || sort === "total_desc" || sort === "total_asc";
  const activitySortActive =
    sort === "active_desc" || sort === "active_asc" || sort === "sessions_desc" || sort === "sessions_asc";

  const th = "text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-widest whitespace-nowrap";

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="rounded-3xl border border-border glass p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1 basis-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, username or email…"
              className="w-full rounded-2xl border border-border bg-transparent pl-9 pr-8 py-2.5 text-sm outline-none focus:border-primary transition"
            />
            {search && (
              <button
                onClick={() => { setSearch(""); setDebouncedSearch(""); setPage(1); }}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 grid h-6 w-6 place-items-center rounded-full text-muted-foreground hover:bg-muted transition"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <select
            value={exam}
            onChange={(e) => { setExam(e.target.value); setPage(1); }}
            className="rounded-2xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary transition"
            aria-label="Filter by exam"
          >
            <option value="">All exams</option>
            {(exams.data ?? []).map((e) => (
              <option key={e.id} value={e.slug}>{e.name}{!e.enabled ? " (disabled)" : ""}</option>
            ))}
          </select>

          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value as UserStatusFilter); setPage(1); }}
            className="rounded-2xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary transition"
            aria-label="Filter by account status"
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="blocked">Blocked</option>
            <option value="temp_blocked">Temporarily blocked</option>
            <option value="onboarding">Onboarding pending</option>
          </select>

          <select
            value={minApproved === null ? "" : String(minApproved)}
            onChange={(e) => { setMinApproved(e.target.value === "" ? null : Number(e.target.value)); setPage(1); }}
            className="rounded-2xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary transition"
            aria-label="Filter by approved contributions"
          >
            {MIN_APPROVED_OPTIONS.map((o) => (
              <option key={String(o.value)} value={o.value === null ? "" : String(o.value)}>{o.label}</option>
            ))}
          </select>

          <select
            value={sort}
            onChange={(e) => { setSort(e.target.value as UserSort); setPage(1); }}
            className="rounded-2xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary transition"
            aria-label="Sort users"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {activeFilterCount > 0 && (
            <button
              onClick={resetAll}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2.5 text-sm font-semibold hover:bg-muted active:scale-95 transition"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </button>
          )}
        </div>

        {/* Active filter chips */}
        {activeFilterCount > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {debouncedSearch && (
              <Chip onRemove={() => removeFilter("search")}>Search: “{debouncedSearch}”</Chip>
            )}
            {exam && (
              <Chip onRemove={() => removeFilter("exam")}>Exam: {examNameOf(exam)}</Chip>
            )}
            {status && (
              <Chip onRemove={() => removeFilter("status")}>
                Status: {status === "temp_blocked" ? "Temporarily blocked" : status === "onboarding" ? "Onboarding pending" : status}
              </Chip>
            )}
            {minApproved !== null && (
              <Chip onRemove={() => removeFilter("minApproved")}>Approved ≥ {minApproved}</Chip>
            )}
            {sort !== "newest" && (
              <Chip onRemove={() => removeFilter("sort")}>Sort: {SORT_OPTIONS.find((o) => o.value === sort)?.label}</Chip>
            )}
          </div>
        )}
      </div>

      {/* Counts */}
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 font-bold text-foreground">
            <Users className="h-4 w-4 text-primary" /> {total.toLocaleString()}
          </span>{" "}
          registered users
          {activeFilterCount > 0 && (
            <> · <span className="font-semibold text-foreground">{total.toLocaleString()}</span> match filters</>
          )}
        </div>
        {query.isFetching && (
          <span className="text-xs text-muted-foreground animate-pulse">updating…</span>
        )}
      </div>

      {/* Table (desktop) */}
      <div className="hidden lg:block rounded-2xl border border-border glass overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className={th}>User</th>
              <th className={th}>Exam</th>
              <th className={`${th} text-right`}>Dio</th>
              <th className={th}>
                <button onClick={toggleContribution} className="inline-flex items-center gap-1 hover:text-foreground transition" title="Sort by contributions">
                  Contributions
                  <SortIndicator
                    active={contributionsSortActive}
                    dir={sort.endsWith("_asc") ? "asc" : "desc"}
                  />
                </button>
              </th>
              <th className={th}>
                <button onClick={toggleActivity} className="inline-flex items-center gap-1 hover:text-foreground transition" title="Sort by activity">
                  Active time
                  <SortIndicator active={activitySortActive} dir={sort.endsWith("_asc") ? "asc" : "desc"} />
                </button>
              </th>
              <th className={th}>
                <button onClick={toggleLastActive} className="inline-flex items-center gap-1 hover:text-foreground transition" title="Sort by last active">
                  Last active
                  <SortIndicator active={sort === "recent" || sort === "stale"} dir={sort === "recent" ? "desc" : "asc"} />
                </button>
              </th>
              <th className={th}>Status</th>
              <th className={th}>
                <button onClick={toggleJoined} className="inline-flex items-center gap-1 hover:text-foreground transition" title="Sort by registration date">
                  Joined
                  <SortIndicator active={sort === "newest" || sort === "oldest"} dir={sort === "newest" ? "desc" : "asc"} />
                </button>
              </th>
              <th className={`${th} text-right`}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {query.isLoading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-t border-border">
                    <td colSpan={9} className="p-3">
                      <div className="h-10 rounded-lg bg-muted/60 animate-pulse" />
                    </td>
                  </tr>
                ))
              : users.map((u) => {
                  const st = statusInfo(u);
                  return (
                    <tr key={u.id} className="border-t border-border hover:bg-muted/30 transition">
                      <td className="p-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar user={u} />
                          <div className="min-w-0">
                            <div className="font-semibold truncate">{u.display_name || "—"}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              @{u.username ?? "—"} · {u.email ?? "no email"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        {u.selected_exam ? (
                          <>
                            {examNameOf(u.selected_exam)}
                            {u.preparation_year ? <span className="text-muted-foreground"> · {u.preparation_year}</span> : null}
                          </>
                        ) : (
                          <span className="text-muted-foreground italic">—</span>
                        )}
                      </td>
                      <td className="p-3 text-right tabular-nums font-semibold text-[#e8b23a]">✦ {u.dio_balance.toLocaleString()}</td>
                      <td className="p-3 whitespace-nowrap">
                        <span className="font-semibold tabular-nums">{u.approved_submissions}</span>
                        <span className="text-xs text-muted-foreground"> approved</span>
                        <div className="text-[11px] text-muted-foreground tabular-nums">
                          {u.total_submissions} total · {u.rejected_submissions} rejected
                        </div>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span className="font-semibold tabular-nums">{formatActiveTime(u.total_active_seconds)}</span>
                        <div className="text-[11px] text-muted-foreground tabular-nums">
                          {u.total_sessions} sessions · {formatDuration(u.avg_session_seconds)} avg
                        </div>
                      </td>
                      <td className="p-3 whitespace-nowrap text-xs text-muted-foreground">{timeAgo(u.last_active_at)}</td>
                      <td className="p-3">
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold whitespace-nowrap ${st.cls}`}>
                          {u.is_blocked && u.account_status !== "blocked" ? <Clock className="h-3 w-3" /> : u.is_blocked ? <Ban className="h-3 w-3" /> : null}
                          {st.label}
                        </span>
                      </td>
                      <td className="p-3 whitespace-nowrap text-xs text-muted-foreground">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-3">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => setViewingId(u.id)}
                            className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold hover:bg-primary/10 hover:text-primary transition"
                          >
                            <Eye className="h-3.5 w-3.5" /> View
                          </button>
                          {u.is_blocked ? (
                            <button
                              onClick={() => { setViewingId(u.id); }}
                              className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold hover:bg-primary/10 hover:text-primary transition"
                            >
                              <Undo2 className="h-3.5 w-3.5" /> Unblock
                            </button>
                          ) : (
                            <button
                              onClick={() => { setViewingId(u.id); }}
                              className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold hover:bg-destructive/10 hover:text-destructive transition"
                            >
                              <Ban className="h-3.5 w-3.5" /> Block
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
          </tbody>
        </table>
        {users.length === 0 && !query.isLoading && (
          <div className="p-12 text-center text-sm text-muted-foreground">No users match these filters.</div>
        )}
      </div>

      {/* Cards (mobile / tablet) */}
      <ul className="grid gap-3 lg:hidden">
        {query.isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <li key={i} className="rounded-2xl border border-border glass p-4">
                <div className="h-16 rounded-xl bg-muted/60 animate-pulse" />
              </li>
            ))
          : users.map((u) => {
              const st = statusInfo(u);
              return (
                <li key={u.id} className="rounded-2xl border border-border glass p-4">
                  <div className="flex items-start gap-3">
                    <Avatar user={u} />
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold truncate">{u.display_name || "—"}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        @{u.username ?? "—"} · {u.email ?? "no email"}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                        <span>{u.selected_exam ? `${examNameOf(u.selected_exam)}${u.preparation_year ? ` ${u.preparation_year}` : ""}` : "No exam"}</span>
                        <span>·</span>
                        <span className="tabular-nums text-[#e8b23a] font-semibold">✦ {u.dio_balance.toLocaleString()}</span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${st.cls}`}>
                          {u.is_blocked && u.account_status !== "blocked" ? <Clock className="h-3 w-3" /> : u.is_blocked ? <Ban className="h-3 w-3" /> : null}
                          {st.label}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                          ✓ {u.approved_submissions} approved
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                          ⏱ {formatActiveTime(u.total_active_seconds)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-muted-foreground">Active {timeAgo(u.last_active_at)}</span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setViewingId(u.id)}
                        className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold hover:bg-primary/10 hover:text-primary transition"
                      >
                        <Eye className="h-3.5 w-3.5" /> View
                      </button>
                      <button
                        onClick={() => setViewingId(u.id)}
                        className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                          u.is_blocked ? "hover:bg-primary/10 hover:text-primary" : "hover:bg-destructive/10 hover:text-destructive"
                        }`}
                      >
                        {u.is_blocked ? <Undo2 className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" />}
                        {u.is_blocked ? "Unblock" : "Block"}
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
        {users.length === 0 && !query.isLoading && (
          <li className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            No users match these filters.
          </li>
        )}
      </ul>

      {/* Pagination */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-muted-foreground tabular-nums">
          {total === 0
            ? "0 users"
            : `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} of ${total}`}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || query.isFetching}
            className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Prev
          </button>
          <span className="text-xs text-muted-foreground tabular-nums">Page {page} of {pageCount}</span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= pageCount || query.isFetching}
            className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Profile slide-over */}
      <AnimatePresence>
        {viewingId && (
          <UserProfilePanel
            userId={viewingId}
            examNameOf={examNameOf}
            onClose={() => setViewingId(null)}
            onChanged={() => {
              qc.invalidateQueries({ queryKey: ["admin", "users"] });
              qc.invalidateQueries({ queryKey: ["admin", "user_profile"] });
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ============================ bits ============================ */

function Chip({ children, onRemove }: { children: React.ReactNode; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 pl-3 pr-1.5 py-1 text-xs font-semibold text-primary">
      {children}
      <button
        onClick={onRemove}
        aria-label="Remove filter"
        className="grid h-5 w-5 place-items-center rounded-full hover:bg-primary/20 transition"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

function Avatar({ user }: { user: AdminUserRow }) {
  const name = user.display_name || user.email || "?";
  const initial = name[0]?.toUpperCase() ?? "?";
  if (user.avatar_url) {
    return (
      <img src={user.avatar_url} alt="" className="h-10 w-10 shrink-0 rounded-full border border-border object-cover" />
    );
  }
  return (
    <div className="h-10 w-10 shrink-0 rounded-full gradient-primary grid place-items-center text-sm font-black text-primary-foreground">
      {initial}
    </div>
  );
}

/* ============================ profile panel ============================ */

function UserProfilePanel({
  userId,
  examNameOf,
  onClose,
  onChanged,
}: {
  userId: string;
  examNameOf: (slug: string | null) => string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { data: detail, isLoading, isError } = useAdminUserProfile(userId);
  const setBlock = useServerFn(adminSetBlock);
  const [busy, setBusy] = useState<BlockAction | null>(null);

  const [tempOpen, setTempOpen] = useState(false);
  const [durationHours, setDurationHours] = useState<number>(24);
  const [startAt, setStartAt] = useState<string>(""); // datetime-local; empty = now
  const [reason, setReason] = useState("");

  const doBlock = async (action: BlockAction, opts?: { durationHours?: number; reason?: string; startAt?: string }) => {
    if (busy) return;
    setBusy(action);
    try {
      const res = await setBlock({
        data: {
          userId,
          action,
          durationHours: opts?.durationHours,
          reason: opts?.reason,
          startAt: opts?.startAt,
        },
      });
      if (!res.ok) throw new Error(res.error === "CANNOT_BLOCK_ADMIN" ? "Admins cannot block other admins" : res.error ?? "Action failed");
      toast.success(
        action === "block" ? "User blocked" : action === "temp_block" ? "Temporary block applied" : "User unblocked",
      );
      setTempOpen(false);
      setReason("");
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(null);
    }
  };

  const expiry = useMemo(() => {
    if (!durationHours) return null;
    const base = startAt ? new Date(startAt).getTime() : Date.now();
    return new Date(base + durationHours * 3_600_000);
  }, [durationHours, startAt]);

  const p = detail?.profile;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="absolute inset-y-0 right-0 w-full max-w-md overflow-y-auto border-l border-border glass-strong p-5 sm:p-6"
        style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold">User profile</h3>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full hover:bg-muted transition active:scale-90">
            <X className="h-4 w-4" />
          </button>
        </div>

        {isLoading && (
          <div className="mt-8 flex justify-center text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        )}

        {isError && (
          <div className="mt-8 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Couldn't load this profile.
          </div>
        )}

        {!isLoading && !isError && detail && p && (
          <div className="mt-5 space-y-5">
            {/* Basic profile */}
            <section>
              <div className="flex items-center gap-4">
                {p.avatar_url ? (
                  <img src={p.avatar_url} alt="" className="h-16 w-16 shrink-0 rounded-full border border-border object-cover" />
                ) : (
                  <div className="h-16 w-16 shrink-0 rounded-full gradient-primary grid place-items-center text-2xl font-black text-primary-foreground">
                    {(p.display_name || p.email || "?")[0]?.toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <h4 className="text-lg font-bold break-words">{p.display_name || "—"}</h4>
                  <div className="text-sm text-muted-foreground truncate">@{p.username ?? "—"}</div>
                  <div className="text-xs text-muted-foreground break-all">{p.email ?? "no email"}</div>
                </div>
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <Detail label="Exam" value={p.selected_exam ? `${examNameOf(p.selected_exam)}${p.preparation_year ? ` ${p.preparation_year}` : ""}` : "—"} />
                <Detail label="Status" value={
                  p.account_status === "blocked"
                    ? "Blocked"
                    : p.blocked_until && new Date(p.blocked_until).getTime() > Date.now()
                      ? `Temp block until ${new Date(p.blocked_until).toLocaleString()}`
                      : "Active"
                } />
                <Detail label="Registered" value={new Date(p.created_at).toLocaleDateString()} />
                <Detail label="Last active" value={timeAgo(p.last_active_at)} />
                {p.block_reason && <Detail label="Block reason" value={p.block_reason} wide />}
              </dl>
            </section>

            {/* Activity */}
            <section className="rounded-2xl border border-border p-4">
              <div className="text-[10px] tracking-widest text-muted-foreground">DYPOL ACTIVITY</div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <Stat label="Dio" value={`✦ ${detail.dio_balance.toLocaleString()}`} />
                <Stat label="Approved" value={String(detail.submissions.approved)} />
                <Stat label="Total" value={String(detail.submissions.total)} />
                <Stat label="Pending" value={String(detail.submissions.pending)} />
                <Stat label="Rejected" value={String(detail.submissions.rejected)} />
                <Stat label="Unlocks" value={String(detail.unlocks_count)} />
                <Stat label="Active time" value={formatActiveTime(p.total_active_seconds)} />
                <Stat label="Sessions" value={String(p.total_sessions)} />
                <Stat label="Avg session" value={formatDuration(detail.avg_session_seconds)} />
              </div>
              <div className="mt-2 text-[11px] text-muted-foreground">
                {detail.bookmarks_count} bookmarks · {detail.unlocks_count} unlocked resources
              </div>

              {detail.recent_sessions.length > 0 && (
                <div className="mt-4">
                  <div className="text-xs font-semibold text-muted-foreground mb-1.5">RECENT SESSIONS</div>
                  <ul className="space-y-1">
                    {detail.recent_sessions.slice(0, 5).map((s) => (
                      <li key={s.id} className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{new Date(s.started_at).toLocaleString()}</span>
                        <span className="tabular-nums">{formatDuration(s.active_seconds)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {detail.recent_submissions.length > 0 && (
                <div className="mt-4">
                  <div className="text-xs font-semibold text-muted-foreground mb-1.5">RECENT SUBMISSIONS</div>
                  <ul className="space-y-1">
                    {detail.recent_submissions.slice(0, 5).map((s) => (
                      <li key={s.id} className="flex items-center justify-between gap-2 text-xs">
                        <span className="truncate">{s.name}</span>
                        <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                          s.status === "approved" ? "bg-primary/10 text-primary" : s.status === "rejected" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"
                        }`}>
                          {s.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>

            {/* Account controls */}
            <section className="rounded-2xl border border-border p-4">
              <div className="text-[10px] tracking-widest text-muted-foreground">ACCOUNT CONTROLS</div>
              <div className="mt-3 grid gap-2">
                {p.account_status === "blocked" || (p.blocked_until && new Date(p.blocked_until).getTime() > Date.now()) ? (
                  <button
                    onClick={() => doBlock("unblock")}
                    disabled={busy !== null}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-primary/50 text-primary px-5 py-2.5 text-sm font-semibold hover:bg-primary/10 active:scale-95 transition disabled:opacity-60"
                  >
                    {busy === "unblock" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Undo2 className="h-4 w-4" />}
                    Unblock user
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => doBlock("block")}
                      disabled={busy !== null}
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-destructive/10 border border-destructive/40 text-destructive px-5 py-2.5 text-sm font-semibold hover:bg-destructive/15 active:scale-95 transition disabled:opacity-60"
                    >
                      {busy === "block" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                      Block user permanently
                    </button>
                    <button
                      onClick={() => setTempOpen((v) => !v)}
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-[#e8b23a]/50 text-[#e8b23a] px-5 py-2.5 text-sm font-semibold hover:bg-[#e8b23a]/10 active:scale-95 transition"
                    >
                      <CalendarClock className="h-4 w-4" /> Temporary block…
                    </button>
                  </>
                )}

                {tempOpen && p.account_status !== "blocked" && (
                  <div className="mt-2 rounded-xl border border-dashed border-border p-3 space-y-3">
                    <div>
                      <label className="text-[10px] tracking-widest text-muted-foreground">DURATION</label>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {[1, 6, 12, 24, 48, 72, 168, 720].map((h) => (
                          <button
                            key={h}
                            onClick={() => setDurationHours(h)}
                            className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition active:scale-95 ${
                              durationHours === h ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/50"
                            }`}
                          >
                            {h < 24 ? `${h}h` : h < 168 ? `${h / 24}d` : "30d"}
                          </button>
                        ))}
                      </div>
                      <input
                        type="number"
                        min={1}
                        max={8760}
                        value={durationHours}
                        onChange={(e) => setDurationHours(Math.max(1, Math.min(8760, Math.floor(Number(e.target.value) || 1))))}
                        className="mt-2 w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-primary transition"
                        aria-label="Custom duration in hours"
                      />
                      <div className="mt-1 text-[11px] text-muted-foreground">hours (1–8760)</div>
                    </div>
                    <div>
                      <label className="text-[10px] tracking-widest text-muted-foreground">START TIME (OPTIONAL)</label>
                      <input
                        type="datetime-local"
                        value={startAt}
                        onChange={(e) => setStartAt(e.target.value)}
                        className="mt-1.5 w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-primary transition"
                      />
                      <div className="mt-1 text-[11px] text-muted-foreground">Leave empty to start immediately.</div>
                    </div>
                    <div>
                      <label className="text-[10px] tracking-widest text-muted-foreground">REASON</label>
                      <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        rows={2}
                        maxLength={500}
                        placeholder="Why is this account being blocked?"
                        className="mt-1.5 w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-primary transition resize-y"
                      />
                    </div>
                    {expiry && (
                      <div className="text-xs text-muted-foreground">
                        Access restores automatically at{" "}
                        <span className="font-semibold text-foreground">{expiry.toLocaleString()}</span>
                      </div>
                    )}
                    <button
                      onClick={() => doBlock("temp_block", {
                        durationHours,
                        reason,
                        startAt: startAt ? new Date(startAt).toISOString() : undefined,
                      })}
                      disabled={busy !== null || !durationHours}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-full gradient-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold btn-glow active:scale-95 transition disabled:opacity-60"
                    >
                      {busy === "temp_block" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldOff className="h-4 w-4" />}
                      Apply temporary block
                    </button>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

function Detail({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? "col-span-2" : ""}>
      <dt className="text-[10px] tracking-widest text-muted-foreground">{label.toUpperCase()}</dt>
      <dd className="mt-0.5 break-words font-medium">{value}</dd>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border px-2 py-2">
      <div className="font-bold text-sm tabular-nums break-words">{value}</div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">{label}</div>
    </div>
  );
}
