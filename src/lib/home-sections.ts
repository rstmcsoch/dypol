import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface HomeSlide {
  id: string;
  image_url: string | null;
  caption: string;
  link: string;
  sort_order: number;
  enabled: boolean;
}

export interface HomeStat {
  id: string;
  label: string;
  value: number;
  unit: string;
  caption: string;
  sort_order: number;
  enabled: boolean;
}

export interface HomePost {
  id: string;
  name: string;
  role_title: string;
  bio: string;
  avatar_url: string | null;
  link: string;
  sort_order: number;
  enabled: boolean;
}

export const homeSlidesQO = queryOptions({
  queryKey: ["home_slides"],
  queryFn: async (): Promise<HomeSlide[]> => {
    const { data, error } = await supabase
      .from("home_slides")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return (data ?? []) as HomeSlide[];
  },
});

export const homeStatsQO = queryOptions({
  queryKey: ["home_stats"],
  queryFn: async (): Promise<HomeStat[]> => {
    const { data, error } = await supabase
      .from("home_stats")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return ((data ?? []) as HomeStat[]).map((s) => ({ ...s, value: Number(s.value) }));
  },
});

export const homePostsQO = queryOptions({
  queryKey: ["home_posts"],
  queryFn: async (): Promise<HomePost[]> => {
    const { data, error } = await supabase
      .from("home_posts")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return (data ?? []) as HomePost[];
  },
});

export function useHomeSlides() {
  return useQuery(homeSlidesQO);
}
export function useHomeStats() {
  return useQuery(homeStatsQO);
}
export function useHomePosts() {
  return useQuery(homePostsQO);
}

/* ---------------- Admin mutations (RLS: admin only) ---------------- */

export function useSaveHomeSlide() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (s: Partial<HomeSlide> & { id?: string }) => {
      if (s.id) {
        const { id, ...rest } = s;
        const { error } = await supabase.from("home_slides").update(rest).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("home_slides").insert({
          image_url: s.image_url ?? null,
          caption: s.caption ?? "",
          link: s.link ?? "",
          sort_order: s.sort_order ?? 1000,
          enabled: s.enabled ?? true,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["home_slides"] }),
  });
}

export function useDeleteHomeSlide() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("home_slides").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["home_slides"] }),
  });
}

export function useSaveHomeStat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (s: Partial<HomeStat> & { id?: string }) => {
      if (s.id) {
        const { id, ...rest } = s;
        const { error } = await supabase.from("home_stats").update(rest).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("home_stats").insert({
          label: s.label ?? "New stat",
          value: s.value ?? 0,
          unit: s.unit ?? "",
          caption: s.caption ?? "",
          sort_order: s.sort_order ?? 1000,
          enabled: s.enabled ?? true,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["home_stats"] }),
  });
}

export function useDeleteHomeStat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("home_stats").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["home_stats"] }),
  });
}

export function useSaveHomePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: Partial<HomePost> & { id?: string }) => {
      if (p.id) {
        const { id, ...rest } = p;
        const { error } = await supabase.from("home_posts").update(rest).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("home_posts").insert({
          name: p.name ?? "New person",
          role_title: p.role_title ?? "",
          bio: p.bio ?? "",
          avatar_url: p.avatar_url ?? null,
          link: p.link ?? "",
          sort_order: p.sort_order ?? 1000,
          enabled: p.enabled ?? true,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["home_posts"] }),
  });
}

export function useDeleteHomePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("home_posts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["home_posts"] }),
  });
}
