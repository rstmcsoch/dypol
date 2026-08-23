import { memo } from "react";
import { motion } from "framer-motion";
import { BookOpen, FileText, Sparkles, Clock, ClipboardList, GraduationCap, Lock } from "lucide-react";
import { AccessButton } from "@/components/dio/AccessButton";
import { ShareButtons } from "@/components/ShareButtons";
import { BookmarkButton } from "@/components/BookmarkButton";
import { DioStar } from "@/components/dio/DioBits";
import { useAuth } from "@/hooks/use-auth";
import { useUnlockedSet, unlockKey } from "@/lib/dio";
import { TYPE_ICONS } from "@/lib/type-icons";
import type { Material } from "@/lib/site-api";

interface Props {
  material: Material;
  examName?: string;
  index: number;
}

/**
 * Material card with a predictable internal structure:
 * header → title → description → type → image → flexible spacer →
 * primary action row → secondary action row.
 * The footer is pinned to the bottom so cards in the same grid row
 * always align regardless of title/description length.
 */
function MaterialCardBase({ material: m, examName, index }: Props) {
  const { user } = useAuth();
  const { set } = useUnlockedSet(user?.id);
  const unlocked = set.has(unlockKey("material", m.id));
  const cost = m.dio_cost ?? 0;
  const hasLink = !!m.link;
  const Icon = TYPE_ICONS[m.type] ?? BookOpen;

  const badge = (() => {
    if (unlocked)
      return (
        <span
          title="Already unlocked"
          className="inline-flex h-10 shrink-0 items-center gap-1 rounded-full border border-[#e8b23a]/40 bg-[#e8b23a]/10 px-3 text-[10px] font-bold text-[#e8b23a]"
        >
          <DioStar /> Unlocked
        </span>
      );
    if (!hasLink)
      return (
        <span
          title="Link coming soon"
          className="inline-flex h-10 shrink-0 items-center gap-1 rounded-full border border-border px-3 text-[10px] font-bold text-muted-foreground"
        >
          <Lock className="h-3 w-3" /> Locked
        </span>
      );
    if (cost === 0)
      return (
        <span
          title="Free"
          className="inline-flex h-10 shrink-0 items-center rounded-full border border-border px-3 text-[10px] font-bold text-muted-foreground"
        >
          Free
        </span>
      );
    return (
      <span
        title={`Costs ${cost} Dio`}
        className="inline-flex h-10 shrink-0 items-center gap-1 rounded-full border border-[#e8b23a]/40 bg-[#e8b23a]/10 px-3 text-[10px] font-bold text-[#e8b23a]"
      >
        {m.tier === "PREMIUM" ? "Premium" : <DioStar className="text-[9px]" />}
        <span className="tabular-nums">
          {m.tier === "PREMIUM" ? <>✦ {cost}</> : cost}
        </span>
      </span>
    );
  })();

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.02, 0.3) }}
      className="group flex h-full min-w-0 flex-col rounded-2xl border border-border glass p-4 sm:p-5 hover:border-primary/50 hover:-translate-y-1 transition-all"
    >
      {/* 1. Header / badge */}
      <div className="flex items-start justify-between gap-2">
        <span
          className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
            m.tier === "PREMIUM" ? "gradient-primary text-primary-foreground" : "bg-muted text-foreground"
          }`}
        >
          {m.tier === "PREMIUM" ? "★ PREMIUM" : "🔥 CORE"}
        </span>
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </div>

      {/* 2. Title */}
      <div className="mt-4 text-[10px] tracking-widest text-muted-foreground">
        {m.subject}
        {examName ? ` · ${examName}` : ""}
      </div>
      <h3 className="mt-1 text-lg font-bold leading-tight break-words line-clamp-2" title={m.title}>
        {m.title}
      </h3>

      {/* 3. Description */}
      <p className="mt-2 text-sm text-muted-foreground break-words line-clamp-3">{m.description}</p>

      {/* 4. Resource type */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        <span className="inline-block rounded-md bg-muted px-2 py-0.5 text-xs">{m.type}</span>
        {m.credit_name && (
          <span className="inline-block rounded-md bg-primary/10 px-2 py-0.5 text-xs text-primary">
            Contributed by {m.credit_name}
          </span>
        )}
      </div>

      {/* 5. Image / thumbnail */}
      {m.image_url ? (
        <img
          src={m.image_url}
          alt=""
          loading="lazy"
          decoding="async"
          className="mt-4 aspect-video w-full rounded-xl border border-border object-cover bg-muted/40"
        />
      ) : (
        <div className="mt-4 aspect-video w-full rounded-xl border border-dashed border-border/60 grid place-items-center text-[10px] text-muted-foreground">
          image slot
        </div>
      )}

      {/* 6. Flexible spacer — keeps footers aligned across the grid row */}
      <div className="flex-1" />

      {/* 7. Primary action area */}
      <div className="mt-4 flex items-center gap-2">
        <AccessButton
          kind="material"
          itemId={m.id}
          cost={cost}
          link={m.link}
          label="Access Resource"
          withBadge={false}
        />
        {badge}
      </div>

      {/* 8. Secondary action row */}
      <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-border/60 pt-2.5">
        <ShareButtons />
        <BookmarkButton
          kind="material"
          refId={m.id}
          title={m.title}
          subtitle={`${m.subject} · ${m.type}`}
          url={m.link}
          imageUrl={m.image_url}
        />
      </div>
    </motion.article>
  );
}

export const MaterialCard = memo(MaterialCardBase);
