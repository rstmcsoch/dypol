import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { MessageCircle, Mail, Coffee, Heart, ArrowUpRight, Settings } from "lucide-react";
import { useSiteSettings } from "@/lib/site-api";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: "Support — Dypol" },
      { name: "description", content: "Get help, share feedback, or support Dypol." },
    ],
  }),
  ssr: false,
  component: Support,
});

function Support() {
  const { isAdmin } = useAuth();
  const { data: s } = useSiteSettings();

  return (
    <main className="px-4 md:px-8 pt-6 pb-16">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs font-semibold text-primary"
          >
            ✦ WE'VE GOT YOU
          </motion.div>
          {isAdmin && (
            <Link
              to="/admin"
              className="inline-flex items-center gap-1.5 rounded-full gradient-primary text-primary-foreground text-xs font-semibold px-3 py-1.5 btn-glow active:scale-95 transition"
            >
              <Settings className="h-3.5 w-3.5" /> Edit
            </Link>
          )}
        </div>
        <h1 className="mt-4 font-display text-5xl md:text-7xl font-black tracking-tighter">
          Support, <span className="text-gradient">unscripted.</span>
        </h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-2xl">
          {s?.support_body ?? "Real answers, quick. Reach out any way that feels right."}
        </p>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {s?.support_whatsapp && (
            <SupportCard
              icon={MessageCircle}
              title="Chat / WhatsApp"
              body="Fastest way to get unstuck."
              cta={s.support_whatsapp}
              href={
                s.support_whatsapp.startsWith("http")
                  ? s.support_whatsapp
                  : `https://wa.me/${s.support_whatsapp.replace(/\D/g, "")}`
              }
            />
          )}
          {s?.support_email && (
            <SupportCard
              icon={Mail}
              title="Email"
              body="For bigger topics or attachments."
              cta={s.support_email}
              href={`mailto:${s.support_email}`}
            />
          )}
          {!s?.support_whatsapp && !s?.support_email && (
            <div className="md:col-span-2 rounded-3xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No support channels set up yet.{" "}
              {isAdmin && (
                <>
                  Add them in{" "}
                  <Link to="/admin" className="text-primary underline">
                    Admin → Site
                  </Link>
                  .
                </>
              )}
            </div>
          )}
          <SupportCard
            icon={Coffee}
            title="Buy us a Chai"
            body="If Dypol is helping you, help keep it alive."
            cta="Donate"
          />
          <SupportCard
            icon={Heart}
            title="Feature requests"
            body="Tell us what you'd love next."
            cta="Share idea"
          />
        </div>

        <div className="mt-12 rounded-3xl border border-border glass p-8 text-center">
          <h2 className="font-display text-3xl font-bold">Live it your way.</h2>
          <p className="mt-2 text-muted-foreground">Dypol grows because you use it.</p>
        </div>
      </div>
    </main>
  );
}

function SupportCard({
  icon: Icon,
  title,
  body,
  cta,
  href,
}: {
  icon: typeof MessageCircle;
  title: string;
  body: string;
  cta: string;
  href?: string;
}) {
  const inner = (
    <>
      <div className="grid h-12 w-12 place-items-center rounded-2xl gradient-primary text-primary-foreground">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-4 text-xl font-bold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
      <div className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary group-hover:gap-2 transition-all">
        {cta} <ArrowUpRight className="h-3.5 w-3.5" />
      </div>
    </>
  );
  const cls =
    "group block rounded-3xl border border-border glass p-6 hover:border-primary/50 hover:-translate-y-1 transition-all";
  return href ? (
    <a
      href={href}
      target={href.startsWith("http") ? "_blank" : undefined}
      rel="noreferrer"
      className={cls}
    >
      {inner}
    </a>
  ) : (
    <div className={cls}>{inner}</div>
  );
}
