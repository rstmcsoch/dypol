import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Bot, Loader2, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { askAdminAssistant, type AdminAssistantMessage } from "@/lib/admin-ai.functions";

const STARTERS = [
  "Draft a calmer hero headline for the home page.",
  "Suggest 3 daily-quote ideas for exam week.",
  "How should I price a new Dio-gated material?",
];

export function AssistantTab() {
  const ask = useServerFn(askAdminAssistant);
  const [messages, setMessages] = useState<AdminAssistantMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, busy]);

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || busy) return;

    const next: AdminAssistantMessage[] = [...messages, { role: "user", content }];
    setMessages(next);
    setDraft("");
    setBusy(true);

    try {
      const result = await ask({ data: { messages: next } });
      const reply = result?.text?.trim();
      if (!reply) throw new Error("The assistant returned an empty reply");
      setMessages([...next, { role: "assistant", content: reply }]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Assistant failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-3xl border border-border glass overflow-hidden">
      <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl gradient-primary text-primary-foreground">
              <Bot className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold leading-tight">Assistant</h2>
              <p className="text-xs text-muted-foreground">
                Admin only · replies stay on this page · credential never leaves the server
              </p>
            </div>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={() => setMessages([])}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted"
          >
            <Trash2 className="h-3.5 w-3.5" /> Clear
          </button>
        )}
      </div>

      <div
        ref={scroller}
        className="max-h-[min(62vh,560px)] min-h-[320px] space-y-3 overflow-y-auto px-5 py-4"
      >
        {messages.length === 0 && !busy && (
          <div className="grid min-h-[280px] place-items-center text-center">
            <div>
              <p className="text-sm text-muted-foreground">
                Ask for copy, pricing ideas, or admin checklists. Students never see this tab.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {STARTERS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={`${m.role}-${i}`}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                m.role === "user"
                  ? "gradient-primary text-primary-foreground"
                  : "border border-border bg-background/70"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}

        {busy && (
          <div className="flex justify-start text-muted-foreground">
            <div className="inline-flex items-center gap-2 rounded-2xl border border-border px-3.5 py-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" /> Thinking…
            </div>
          </div>
        )}
      </div>

      <form
        className="border-t border-border p-4"
        onSubmit={(e) => {
          e.preventDefault();
          void send(draft);
        }}
      >
        <div className="flex items-end gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(draft);
              }
            }}
            rows={2}
            placeholder="Ask the assistant…"
            className="min-h-[48px] flex-1 resize-y rounded-2xl border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-primary transition"
          />
          <button
            type="submit"
            disabled={busy || !draft.trim()}
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full gradient-primary px-4 text-sm font-semibold text-primary-foreground btn-glow active:scale-95 transition disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send
          </button>
        </div>
      </form>
    </section>
  );
}
