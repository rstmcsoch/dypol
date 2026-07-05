import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { MessageCircle, Mail, Coffee, Heart, ArrowUpRight } from "lucide-react";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "Support — Dypol" },
      { name: "description", content: "Get help, share feedback, or support Dypol." },
    ],
  }),
  component: Support,
});

function Support() {
  return (
    <main className="px-4 md:px-8 pt-6 pb-16">
      <div className="mx-auto max-w-4xl">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs font-semibold text-primary">
          ✦ WE'VE GOT YOU
        </motion.div>
        <h1 className="mt-4 font-display text-5xl md:text-7xl font-black tracking-tighter">
          Support, <span className="text-gradient">unscripted.</span>
        </h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-2xl">
          Real answers, quick. Reach out any way that feels right.
        </p>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <SupportCard icon={MessageCircle} title="Chat with us" body="Fastest way to get unstuck. We usually reply within an hour." cta="Open chat" />
          <SupportCard icon={Mail} title="Email" body="For bigger topics or file attachments." cta="hello@dypol.app" />
          <SupportCard icon={Coffee} title="Buy us a Chai" body="If Dypol is helping you, help keep it alive." cta="Donate" />
          <SupportCard icon={Heart} title="Feature requests" body="Tell us what you'd love next." cta="Share idea" />
        </div>

        <div className="mt-12 rounded-3xl border border-border glass p-8 text-center">
          <div data-slot="support-image" className="mx-auto mb-6 aspect-video max-w-lg rounded-2xl border border-dashed border-border/60 grid place-items-center text-xs text-muted-foreground">
            support banner image slot
          </div>
          <h2 className="font-display text-3xl font-bold">Live it your way.</h2>
          <p className="mt-2 text-muted-foreground">Dypol grows because you use it.</p>
        </div>
      </div>
    </main>
  );
}

function SupportCard({ icon: Icon, title, body, cta }: { icon: typeof MessageCircle; title: string; body: string; cta: string }) {
  return (
    <div className="group rounded-3xl border border-border glass p-6 hover:border-primary/50 hover:-translate-y-1 transition-all">
      <div className="grid h-12 w-12 place-items-center rounded-2xl gradient-primary text-primary-foreground">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-4 text-xl font-bold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
      <button className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:gap-2 transition-all">
        {cta} <ArrowUpRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
