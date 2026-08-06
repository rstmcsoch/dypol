import { createFileRoute } from "@tanstack/react-router";
import { SitePageView } from "@/components/SitePageView";

export const Route = createFileRoute("/terms")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Copyright & Terms — Dypol" },
      { name: "description", content: "The terms of use for Dypol, including how links, third-party content and fair use are handled." },
      { property: "og:title", content: "Copyright & Terms — Dypol" },
      { property: "og:description", content: "Terms of use for Dypol: links, third-party content, fair use and warranties." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <SitePageView slug="terms" fallbackTitle="Copyright & Terms" />,
});
