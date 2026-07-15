import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type BookmarkKind = "material" | "portal" | "link" | "essential";

export interface Bookmark {
  id: string;
  user_id: string;
  kind: BookmarkKind;
  ref_id: string | null;
  title: string;
  subtitle: string | null;
  url: string;
  image_url: string | null;
  created_at: string;
}

export const bookmarksQO = (userId: string | undefined) =>
  queryOptions({
    queryKey: ["bookmarks", userId ?? "anon"],
    enabled: !!userId,
    queryFn: async (): Promise<Bookmark[]> => {
      const { data, error } = await supabase
        .from("bookmarks")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Bookmark[];
    },
  });

export function useBookmarks(userId: string | undefined) {
  return useQuery(bookmarksQO(userId));
}

export interface ToggleInput {
  kind: BookmarkKind;
  ref_id?: string | null;
  title: string;
  subtitle?: string | null;
  url: string;
  image_url?: string | null;
}

export function useToggleBookmark(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ToggleInput) => {
      if (!userId) throw new Error("Sign in to save bookmarks");
      if (input.ref_id) {
        const { data: existing } = await supabase
          .from("bookmarks")
          .select("id")
          .eq("user_id", userId)
          .eq("kind", input.kind)
          .eq("ref_id", input.ref_id)
          .maybeSingle();
        if (existing) {
          const { error } = await supabase.from("bookmarks").delete().eq("id", existing.id);
          if (error) throw error;
          return { removed: true };
        }
      }
      const { error } = await supabase.from("bookmarks").insert({
        user_id: userId,
        kind: input.kind,
        ref_id: input.ref_id ?? null,
        title: input.title,
        subtitle: input.subtitle ?? null,
        url: input.url,
        image_url: input.image_url ?? null,
      });
      if (error) throw error;
      return { removed: false };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bookmarks", userId ?? "anon"] }),
  });
}

export function useDeleteBookmark(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bookmarks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bookmarks", userId ?? "anon"] }),
  });
}
