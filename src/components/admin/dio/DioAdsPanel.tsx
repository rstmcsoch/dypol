import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, CircleOff, Loader2, Pencil, Plus, Save } from "lucide-react";
import {
  useAdOffers,
  useDeleteAdOffer,
  useDioStats,
  useSaveAdOffer,
  type AdOffer,
} from "@/lib/dio";
import { DioStar } from "@/components/dio/DioBits";
import {
  Area,
  Field,
  GoldAmount,
  Loading,
  Modal,
  Panel,
  Select,
  fromLocalInput,
  ghostBtn,
  primaryBtn,
  toLocalInput,
} from "./shared";

export function DioAdsPanel() {
  const { data: offers = [], isLoading } = useAdOffers();
  const { data: stats } = useDioStats();
  const del = useDeleteAdOffer();
  const [editing, setEditing] = useState<Partial<AdOffer> | null>(null);

  const totals = new Map((stats?.ad_totals ?? []).map((a) => [a.id, a]));

  return (
    <Panel
      title="EarnDio ad offers"
      kicker="✦ EARNING"
      actions={
        <button
          onClick={() =>
            setEditing({
              title: "",
              description: "",
              url: "",
              reward_amount: 20,
              verification: "manual",
              active: true,
              sort_order: 100,
              starts_at: null,
              ends_at: null,
            })
          }
          className={primaryBtn}
        >
          <Plus className="h-4 w-4" /> New offer
        </button>
      }
    >
      <p className="text-xs text-muted-foreground">
        Deactivating an offer hides it from students but never deletes its completion or transaction
        history.
      </p>

      {isLoading ? (
        <Loading />
      ) : offers.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No ad offers yet. Create the first one.
        </p>
      ) : (
        <ul className="space-y-2">
          {offers.map((o) => {
            const t = totals.get(o.id);
            return (
              <li
                key={o.id}
                className="flex flex-wrap items-center gap-3 rounded-2xl border border-border glass px-4 py-3"
              >
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm font-bold ${
                    o.active
                      ? "border-[#e8b23a]/40 bg-[#e8b23a]/10 text-[#e8b23a]"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  <DioStar /> +{o.reward_amount}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 font-bold">
                    <span className="truncate">{o.title}</span>
                    {!o.active && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                        INACTIVE
                      </span>
                    )}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {o.description || "No description"} · {o.url || "no URL"} ·{" "}
                    {o.verification === "postback" ? "signed postback" : "manual review"}
                    {t
                      ? ` · ${t.completions} completions · ✦ ${Number(t.dio_distributed).toLocaleString()} distributed`
                      : ""}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setEditing(o)}
                    className="rounded-lg px-3 py-1.5 text-xs font-semibold transition hover:bg-primary/10 hover:text-primary"
                    title="Edit"
                  >
                    <Pencil className="mr-1 inline h-3.5 w-3.5" />
                    Edit
                  </button>
                  {o.active ? (
                    <button
                      onClick={async () => {
                        if (
                          !confirm(
                            `Deactivate "${o.title}"? Students won't see it anymore. History stays intact.`,
                          )
                        )
                          return;
                        try {
                          await del.mutateAsync(o.id);
                          toast.success("Offer deactivated");
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : "Failed");
                        }
                      }}
                      className="rounded-lg px-3 py-1.5 text-xs font-semibold transition hover:bg-destructive/10 hover:text-destructive"
                      title="Deactivate"
                    >
                      <CircleOff className="mr-1 inline h-3.5 w-3.5" />
                      Deactivate
                    </button>
                  ) : (
                    <button
                      onClick={() => setEditing({ ...o, active: true })}
                      className="rounded-lg px-3 py-1.5 text-xs font-semibold transition hover:bg-[#e8b23a]/10 hover:text-[#e8b23a]"
                      title="Re-activate"
                    >
                      <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" />
                      Re-activate
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {editing && <OfferModal editing={editing} onClose={() => setEditing(null)} />}
    </Panel>
  );
}

function OfferModal({ editing, onClose }: { editing: Partial<AdOffer>; onClose: () => void }) {
  const [form, setForm] = useState<Partial<AdOffer>>(editing);
  const save = useSaveAdOffer();
  const set = <K extends keyof AdOffer>(k: K, v: AdOffer[K]) => setForm((f) => ({ ...f, [k]: v }));
  const isNew = !form.id;

  const submit = async () => {
    if (!form.title?.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!form.url?.trim()) {
      toast.error("Activity URL is required");
      return;
    }
    if (form.reward_amount == null || form.reward_amount <= 0) {
      toast.error("Reward must be at least 1 Dio");
      return;
    }
    try {
      await save.mutateAsync({
        ...form,
        title: form.title.trim(),
        description: form.description ?? "",
        url: form.url.trim(),
        reward_amount: Math.max(0, Math.floor(form.reward_amount)),
        sort_order: Math.floor(form.sort_order ?? 100),
      });
      toast.success(isNew ? "Offer created" : "Offer saved");
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  };

  return (
    <Modal title={isNew ? "New ad offer" : "Edit ad offer"} onClose={onClose} wide>
      <div className="grid gap-3">
        <div className="grid gap-2 sm:grid-cols-[1fr_140px]">
          <Field
            label="Title"
            value={form.title ?? ""}
            onChange={(v) => set("title", v)}
            placeholder="Watch & Complete"
          />
          <Field
            label="Reward (Dio)"
            value={String(form.reward_amount ?? 10)}
            onChange={(v) => set("reward_amount", Math.max(0, Math.floor(Number(v) || 0)))}
            type="number"
          />
        </div>
        <Area
          label="Short description"
          value={form.description ?? ""}
          onChange={(v) => set("description", v)}
          rows={2}
        />
        <Field
          label="Multi-step activity URL"
          value={form.url ?? ""}
          onChange={(v) => set("url", v)}
          placeholder="https://…"
        />

        <div className="grid gap-2 sm:grid-cols-3">
          <Select
            label="Verification"
            value={form.verification ?? "manual"}
            onChange={(v) => set("verification", v as AdOffer["verification"])}
            options={[
              { value: "manual", label: "Manual review" },
              { value: "postback", label: "Signed postback" },
            ]}
          />
          <Field
            label="Sort order"
            value={String(form.sort_order ?? 100)}
            onChange={(v) => set("sort_order", Math.floor(Number(v) || 0))}
            type="number"
          />
          <div>
            <span className="text-xs tracking-widest text-muted-foreground">STATUS</span>
            <button
              type="button"
              onClick={() => set("active", !(form.active ?? true))}
              className={`mt-1.5 w-full rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                (form.active ?? true)
                  ? "border-[#e8b23a]/50 bg-[#e8b23a]/10 text-[#e8b23a]"
                  : "border-border text-muted-foreground"
              }`}
            >
              {(form.active ?? true) ? "Active" : "Inactive"}
            </button>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs tracking-widest text-muted-foreground">
              STARTS AT (OPTIONAL)
            </span>
            <input
              type="datetime-local"
              value={toLocalInput(form.starts_at)}
              onChange={(e) => set("starts_at", fromLocalInput(e.target.value))}
              className="mt-1.5 w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-primary transition"
            />
          </label>
          <label className="block">
            <span className="text-xs tracking-widest text-muted-foreground">
              ENDS AT (OPTIONAL)
            </span>
            <input
              type="datetime-local"
              value={toLocalInput(form.ends_at)}
              onChange={(e) => set("ends_at", fromLocalInput(e.target.value))}
              className="mt-1.5 w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-primary transition"
            />
          </label>
        </div>

        <div className="rounded-2xl border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
          {form.verification === "postback" ? (
            <>
              <strong className="text-foreground">Signed postback:</strong> configure your ad
              provider to POST to{" "}
              <code className="rounded bg-muted px-1 py-0.5">/api/public/dio/ad-postback</code> with{" "}
              <code className="rounded bg-muted px-1 py-0.5">
                {'{ "reference": "<ref>", "signature": "<hmac-sha256 hex>" }'}
              </code>{" "}
              using the shared secret in{" "}
              <code className="rounded bg-muted px-1 py-0.5">DIO_AD_POSTBACK_SECRET</code>. Dio is
              credited only after this verified server-to-server call — a frontend "completed" flag
              is never trusted.
            </>
          ) : (
            <>
              <strong className="text-foreground">Manual review:</strong> when a student completes
              the activity, the request appears under
              <em> Review</em> in this tab. Dio is credited only when you approve it. Each offer can
              be earned once per student.
            </>
          )}
        </div>

        <div className="mt-1 flex justify-end gap-2">
          <button onClick={onClose} className={ghostBtn}>
            Cancel
          </button>
          <button onClick={submit} disabled={save.isPending} className={primaryBtn}>
            {save.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isNew ? "Create offer" : "Save"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
