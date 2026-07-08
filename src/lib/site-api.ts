import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Material {
  id: string;
  slug: string | null;
  tier: string;
  subject: string;
  type: string;
  title: string;
  description: string;
  link: string;
  image_url: string | null;
  sort_order: number;
}

export interface Portal {
  id: string;
  slug: string | null;
  name: string;
  description: string;
  link: string;
  logo_url: string | null;
  link_count: number;
  sort_order: number;
}

export interface SiteSettings {
  key: string;
  site_title: string;
  tagline: string;
  hero_headline: string;
  hero_subheadline: string;
  logo_url: string | null;
  hero_image_url: string | null;
  promo_code: string;
  promo_headline: string;
  promo_body: string;
  support_email: string;
  support_whatsapp: string;
  support_body: string;
  footer_tagline: string;
  footer_about: string;
  footer_copyright: string;
  legal_terms_url: string | null;
  legal_dmca_url: string | null;
  legal_privacy_url: string | null;
}

export const materialsQO = queryOptions({
  queryKey: ["materials"],
  queryFn: async (): Promise<Material[]> => {
    const { data, error } = await supabase
      .from("materials")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []) as Material[];
  },
});

export const portalsQO = queryOptions({
  queryKey: ["portals"],
  queryFn: async (): Promise<Portal[]> => {
    const { data, error } = await supabase
      .from("portals")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []) as Portal[];
  },
});

export const siteSettingsQO = queryOptions({
  queryKey: ["site_settings"],
  queryFn: async (): Promise<SiteSettings> => {
    const { data, error } = await supabase
      .from("site_settings")
      .select("*")
      .eq("key", "main")
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("Site settings row missing");
    return data as SiteSettings;
  },
});

export function useMaterials() {
  return useQuery(materialsQO);
}
export function usePortals() {
  return useQuery(portalsQO);
}
export function useSiteSettings() {
  return useQuery(siteSettingsQO);
}

/* ----------------- Admin mutations (RLS enforces admin role) ----------------- */

export function useSaveMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (m: Partial<Material> & { id?: string }) => {
      if (m.id) {
        const { id, ...rest } = m;
        const { error } = await supabase.from("materials").update(rest).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("materials").insert({
          tier: m.tier ?? "CORE",
          subject: m.subject ?? "PCM MIX",
          type: m.type ?? "Books",
          title: m.title ?? "Untitled",
          description: m.description ?? "",
          link: m.link ?? "",
          slug: m.slug ?? null,
          image_url: m.image_url ?? null,
          sort_order: m.sort_order ?? 1000,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["materials"] }),
  });
}

export function useDeleteMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("materials").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["materials"] }),
  });
}

export function useSavePortal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: Partial<Portal> & { id?: string }) => {
      if (p.id) {
        const { id, ...rest } = p;
        const { error } = await supabase.from("portals").update(rest).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("portals").insert({
          name: p.name ?? "Untitled",
          description: p.description ?? "",
          link: p.link ?? "",
          logo_url: p.logo_url ?? null,
          link_count: p.link_count ?? 0,
          slug: p.slug ?? null,
          sort_order: p.sort_order ?? 1000,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["portals"] }),
  });
}

export function useDeletePortal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("portals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["portals"] }),
  });
}

export function useSaveSiteSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<SiteSettings>) => {
      const { error } = await supabase.from("site_settings").update(patch).eq("key", "main");
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["site_settings"] }),
  });
}

/* ----------------- Storage: upload site asset, return long-lived signed URL ----------------- */

const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

export async function uploadSiteAsset(file: File, folder: "logo" | "hero" | "misc"): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from("site-assets")
    .upload(path, file, { upsert: false, contentType: file.type });
  if (upErr) throw upErr;
  const { data, error } = await supabase.storage.from("site-assets").createSignedUrl(path, TEN_YEARS);
  if (error || !data?.signedUrl) throw error ?? new Error("Failed to sign URL");
  return data.signedUrl;
}
