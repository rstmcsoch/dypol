import { createFileRoute } from "@tanstack/react-router";
import { SitePageView } from "@/components/SitePageView";

export const Route = createFileRoute("/privacy")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Privacy Policy — Dypol" },
      { name: "description", content: "What Dypol collects, what it never does, and the choices you have over your account data." },
      { property: "og:title", content: "Privacy Policy — Dypol" },
      { property: "og:description", content: "What Dypol collects, what we never do, and your data choices." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <SitePageView slug="privacy" fallbackTitle="Privacy Policy" />,
});
