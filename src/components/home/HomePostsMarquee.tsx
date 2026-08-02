import { motion } from "framer-motion";
import { ExternalLink, Pause, Play, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useHomePosts, type HomePost } from "@/lib/home-sections";
import { SectionHeading } from "./HomeCarousel";

export function HomePostsMarquee() {
  const { data } = useHomePosts();
  const posts = (data ?? []).filter((p) => p.enabled);
  const [paused, setPaused] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const offset = useRef(0);

  useEffect(() => {
    if (paused || posts.length < 2) return;
    let raf = 0;
    let last = performance.now();
    const step = (t: number) => {
      const dt = t - last;
      last = t;
      const el = trackRef.current;
      if (el) {
        const half = el.scrollWidth / 2;
        offset.current = half ? (offset.current + dt * 0.045) % half : 0;
        el.style.transform = `translateX(-${offset.current}px)`;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [paused, posts.length]);

  if (!posts.length) return null;
  const loop = posts.length > 1 ? [...posts, ...posts] : posts;

  return (
    <section aria-label="People" className="mt-14">
      <div className="flex items-end justify-between gap-4">
        <SectionHeading kicker="PEOPLE" title="Behind Dypol" sub="Hover, tap or use the button to pause." />
        <button
          onClick={() => setPaused((p) => !p)}
          aria-label={paused ? "Resume cards" : "Pause cards"}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-semibold hover:bg-muted active:scale-95 transition"
        >
          {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
          {paused ? "Play" : "Pause"}
        </button>
      </div>

      <div
        className="mt-5 overflow-hidden"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={() => setPaused((p) => !p)}
      >
        <div ref={trackRef} className="flex w-max gap-4 will-change-transform">
          {loop.map((p, i) => (
            <PostCard key={`${p.id}-${i}`} post={p} />
          ))}
        </div>
      </div>
    </section>
  );
}

function PostCard({ post }: { post: HomePost }) {
  return (
    <motion.article
      whileHover={{ y: -6 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      className="w-[260px] sm:w-[300px] shrink-0 rounded-3xl border border-border glass p-5"
    >
      <div className="flex min-w-0 items-center gap-3">
        {post.avatar_url ? (
          <img src={post.avatar_url} alt={post.name} className="h-12 w-12 shrink-0 rounded-2xl border border-border object-cover" />
        ) : (
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-dashed border-border/60 text-muted-foreground">
            <User className="h-4 w-4" />
          </div>
        )}
        <div className="min-w-0">
          <div className="truncate font-semibold">{post.name}</div>
          <div className="truncate text-xs text-primary">{post.role_title}</div>
        </div>
      </div>
      {post.bio && <p className="mt-3 text-sm text-muted-foreground line-clamp-4">{post.bio}</p>}
      {post.link && (
        <a
          href={post.link}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-1.5 text-xs font-semibold hover:bg-muted active:scale-95 transition"
        >
          View <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </motion.article>
  );
}
