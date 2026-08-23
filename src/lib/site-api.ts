import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
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
  has_link: boolean;
  image_url: string | null;
  credit_name: string | null;
  dio_cost: number;
  exam_id: string | null;
  sort_order: number;
}

export interface Portal {
  id: string;
  slug: string | null;
  name: string;
  description: string;
  link: string;
  has_link: boolean;
  logo_url: string | null;
  link_count: number;
  credit_name: string | null;
  dio_cost: number;
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
  share_title: string;
  share_message: string;
  share_link: string;
  share_image_url: string | null;
}

export const materialsQO = queryOptions({
  queryKey: ["materials"],
  queryFn: async (): Promise<Material[]> => {
    const { data, error } = await supabase
      .from("materials_catalog")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []) as Material[];
  },
});

/* ---------------- Server-side paginated/filtered materials ---------------- */

export interface MaterialsPageFilters {
  examId: string | null; // null = all exams
  subjects: string[]; // [] = all subjects
  type: string | null; // null = all types
  q: string;
  page: number;
  pageSize: number;
}

export interface MaterialsPage {
  items: Material[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

const MATERIAL_COLUMNS =
  "id,slug,tier,subject,type,title,description,link,has_link,image_url,credit_name,dio_cost,exam_id,sort_order";

interface MaterialFilterable<T> {
  eq(column: string, value: unknown): T;
  in(column: string, values: unknown[]): T;
  ilike(column: string, pattern: string): T;
}

function applyMaterialFilters<T extends MaterialFilterable<T>>(
  query: T,
  f: MaterialsPageFilters,
): T {
  let q = query;
  if (f.examId) q = q.eq("exam_id", f.examId);
  if (f.subjects.length) q = q.in("subject", f.subjects);
  if (f.type) q = q.eq("type", f.type);
  if (f.q.trim()) q = q.ilike("title", `%${f.q.trim()}%`);
  return q;
}

export const materialsPageQO = (f: MaterialsPageFilters) =>
  queryOptions({
    queryKey: ["materials", "page", f],
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<MaterialsPage> => {
      const page = Math.max(1, f.page);
      const pageSize = Math.min(Math.max(1, f.pageSize), 60);
      const offset = (page - 1) * pageSize;

      const pageQuery = applyMaterialFilters(
        supabase.from("materials_catalog").select(MATERIAL_COLUMNS),
        f,
      )
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true })
        .range(offset, offset + pageSize - 1);

      const countQuery = applyMaterialFilters(
        supabase.from("materials_catalog").select("id", { count: "exact", head: true }),
        f,
      );

      const [pageRes, countRes] = await Promise.all([pageQuery, countQuery]);
      if (pageRes.error) throw pageRes.error;
      if (countRes.error) throw countRes.error;

      const total = countRes.count ?? 0;
      return {
        items: (pageRes.data ?? []) as Material[],
        total,
        page,
        pageSize,
        hasMore: offset + (pageRes.data?.length ?? 0) < total,
      };
    },
  });

export const portalsQO = queryOptions({
  queryKey: ["portals"],
  queryFn: async (): Promise<Portal[]> => {
    const { data, error } = await supabase
      .from("portals_catalog")
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

function normalizeResourceLink(value: string | null | undefined): string {
  const link = value?.trim() ?? "";
  if (!link) return "";
  if (link.length > 4096) throw new Error("Link is too long");
  let parsed: URL;
  try {
    parsed = new URL(link);
  } catch {
    throw new Error("Enter a valid http(s) URL");
  }
  if (parsed.username || parsed.password) {
    throw new Error("URLs containing credentials are not allowed");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Only http(s) links are allowed");
  }
  return link;
}

export function useSaveMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (m: Partial<Material> & { id?: string }) => {
      const link = normalizeResourceLink(m.link);
      if (m.id) {
        const { id, has_link: _hasLink, ...rest } = m;
        const { error } = await supabase
          .from("materials")
          .update({ ...rest, link })
          .eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("materials").insert({
          tier: m.tier ?? "CORE",
          subject: m.subject ?? "PCM Mix",
          type: m.type ?? "Books",
          title: m.title ?? "Untitled",
          description: m.description ?? "",
          link,
          slug: m.slug ?? null,
          image_url: m.image_url ?? null,
          dio_cost: m.dio_cost ?? 0,
          exam_id: m.exam_id ?? null,
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
      const link = normalizeResourceLink(p.link);
      if (p.id) {
        const { id, has_link: _hasLink, ...rest } = p;
        const { error } = await supabase
          .from("portals")
          .update({ ...rest, link })
          .eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("portals").insert({
          name: p.name ?? "Untitled",
          description: p.description ?? "",
          link,
          logo_url: p.logo_url ?? null,
          link_count: p.link_count ?? 0,
          dio_cost: p.dio_cost ?? 0,
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

export async function uploadSiteAsset(
  file: File,
  folder: "logo" | "hero" | "share" | "misc",
): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from("site-assets")
    .upload(path, file, { upsert: false, contentType: file.type });
  if (upErr) throw upErr;
  const { data, error } = await supabase.storage
    .from("site-assets")
    .createSignedUrl(path, TEN_YEARS);
  if (error || !data?.signedUrl) throw error ?? new Error("Failed to sign URL");
  return data.signedUrl;
}
