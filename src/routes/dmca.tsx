import { createFileRoute } from "@tanstack/react-router";
import { SitePageView } from "@/components/SitePageView";

export const Route = createFileRoute("/dmca")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "DMCA Policy — Dypol" },
      { name: "description", content: "How to file a copyright takedown notice for a link listed on Dypol, and how quickly we respond." },
      { property: "og:title", content: "DMCA Policy — Dypol" },
      { property: "og:description", content: "File a copyright takedown notice for a link listed on Dypol." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <SitePageView slug="dmca" fallbackTitle="DMCA Policy" />,
});
