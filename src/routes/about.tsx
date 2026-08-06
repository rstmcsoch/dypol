import { createFileRoute } from "@tanstack/react-router";
import { SitePageView } from "@/components/SitePageView";

export const Route = createFileRoute("/about")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "About Dypol — Live Unscripted Life" },
      { name: "description", content: "What Dypol is, why we built it, and what you get: curated study materials, coaching portals and essentials in one calm place." },
      { property: "og:title", content: "About Dypol — Live Unscripted Life" },
      { property: "og:description", content: "A calm, curated launcher for students building their own path." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <SitePageView slug="about" fallbackTitle="About Dypol" />,
});
