import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SitePage {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  hero_image_url: string | null;
  body: string;
  sort_order: number;
}

export const sitePagesQO = queryOptions({
  queryKey: ["site_pages"],
  queryFn: async (): Promise<SitePage[]> => {
    const { data, error } = await supabase
      .from("site_pages")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return (data ?? []) as SitePage[];
  },
});

export function sitePageQO(slug: string) {
  return queryOptions({
    queryKey: ["site_pages", slug],
    queryFn: async (): Promise<SitePage | null> => {
      const { data, error } = await supabase
        .from("site_pages")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return (data as SitePage) ?? null;
    },
  });
}

export function useSitePages() {
  return useQuery(sitePagesQO);
}

export function useSitePage(slug: string) {
  return useQuery(sitePageQO(slug));
}

export function useSaveSitePage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: Partial<SitePage> & { id?: string }) => {
      if (p.id) {
        const { id, ...rest } = p;
        const { error } = await supabase.from("site_pages").update(rest).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("site_pages").insert({
          slug: (p.slug ?? "").trim() || `page-${Date.now()}`,
          title: p.title ?? "Untitled",
          subtitle: p.subtitle ?? "",
          hero_image_url: p.hero_image_url ?? null,
          body: p.body ?? "",
          sort_order: p.sort_order ?? 100,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["site_pages"] }),
  });
}

export function useDeleteSitePage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("site_pages").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["site_pages"] }),
  });
}
