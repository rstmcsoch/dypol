import { Bookmark, BookmarkCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useBookmarks, useToggleBookmark, type BookmarkKind } from "@/lib/bookmarks";

interface Props {
  kind: BookmarkKind;
  refId: string;
  title: string;
  subtitle?: string;
  url: string;
  imageUrl?: string | null;
  className?: string;
}

export function BookmarkButton({ kind, refId, title, subtitle, url, imageUrl, className }: Props) {
  const { user } = useAuth();
  const { data: bookmarks = [] } = useBookmarks(user?.id);
  const toggle = useToggleBookmark(user?.id);

  const saved = bookmarks.some((b) => b.kind === kind && b.ref_id === refId);

  const onClick = () => {
    if (!user) {
      toast.error("Sign in to save bookmarks");
      return;
    }
    toggle.mutate(
      { kind, ref_id: refId, title, subtitle, url, image_url: imageUrl ?? null },
      {
        onSuccess: (r) =>
          toast.success(r.removed ? "Removed from bookmarks" : "Saved to bookmarks"),
        onError: (e) => toast.error(e instanceof Error ? e.message : "Something went wrong"),
      },
    );
  };

  return (
    <button
      onClick={onClick}
      aria-label={saved ? "Remove bookmark" : "Save bookmark"}
      title={saved ? "Bookmarked" : "Save"}
      className={`grid h-9 w-9 shrink-0 place-items-center rounded-full transition active:scale-90 ${
        saved
          ? "bg-primary/15 text-primary"
          : "hover:bg-muted text-muted-foreground hover:text-primary"
      } ${className ?? ""}`}
    >
      {toggle.isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : saved ? (
        <BookmarkCheck className="h-4 w-4" />
      ) : (
        <Bookmark className="h-4 w-4" />
      )}
    </button>
  );
}
