import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SUBJECTS, RESOURCE_TYPES } from "@/lib/data";

/* ============================================================
   Admin-controlled taxonomy: exams, prep years and material
   filters (subjects + resource types). Single source of truth
   for onboarding, user filters, profiles and materials.
   ============================================================ */

export interface Exam {
  id: string;
  slug: string;
  name: string;
  sort_order: number;
  enabled: boolean;
}

export interface ExamYear {
  id: string;
  exam_id: string;
  year: number;
  enabled: boolean;
  sort_order: number;
}

export interface MaterialFilter {
  id: string;
  kind: "subject" | "type";
  name: string;
  sort_order: number;
  enabled: boolean;
}

/* ---------------- reads ---------------- */

export const examsQO = queryOptions({
  queryKey: ["taxonomy", "exams"],
  staleTime: 5 * 60_000,
  queryFn: async (): Promise<Exam[]> => {
    const { data, error } = await supabase
      .from("exams")
      .select("id,slug,name,sort_order,enabled")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    if (error) throw error;
    return (data ?? []) as Exam[];
  },
});

export const examYearsQO = queryOptions({
  queryKey: ["taxonomy", "exam_years"],
  staleTime: 5 * 60_000,
  queryFn: async (): Promise<ExamYear[]> => {
    const { data, error } = await supabase
      .from("exam_years")
      .select("id,exam_id,year,enabled,sort_order")
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return (data ?? []) as ExamYear[];
  },
});

export const materialFiltersQO = queryOptions({
  queryKey: ["taxonomy", "material_filters"],
  staleTime: 5 * 60_000,
  queryFn: async (): Promise<MaterialFilter[]> => {
    const { data, error } = await supabase
      .from("material_filters")
      .select("id,kind,name,sort_order,enabled")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    if (error) throw error;
    return (data ?? []) as MaterialFilter[];
  },
});

export function useExams() {
  return useQuery(examsQO);
}
export function useExamYears() {
  return useQuery(examYearsQO);
}
export function useMaterialFilters() {
  return useQuery(materialFiltersQO);
}

/** Enabled subjects with a local fallback so the page never renders empty during a DB outage. */
export function useEnabledSubjects() {
  const { data = [] } = useMaterialFilters();
  const list = data.filter((f) => f.kind === "subject" && f.enabled).map((f) => f.name);
  return list.length ? list : [...SUBJECTS];
}

/** Enabled resource types with a local fallback. */
export function useEnabledResourceTypes() {
  const { data = [] } = useMaterialFilters();
  const list = data.filter((f) => f.kind === "type" && f.enabled).map((f) => f.name);
  return list.length ? list : [...RESOURCE_TYPES];
}

/* ---------------- admin mutations ---------------- */

function invalidateTaxonomy(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["taxonomy"] });
  qc.invalidateQueries({ queryKey: ["materials"] });
}

export function useSaveExam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (e: Partial<Exam> & { id?: string }) => {
      if (e.id) {
        const { id, ...rest } = e;
        const { error } = await supabase.from("exams").update(rest).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("exams").insert({
          slug: e.slug ?? "",
          name: e.name ?? "New exam",
          sort_order: e.sort_order ?? 100,
          enabled: e.enabled ?? true,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => invalidateTaxonomy(qc),
  });
}

export function useSaveExamYear() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { examId: string; year: number; enabled?: boolean }) => {
      const { error } = await supabase.from("exam_years").insert({
        exam_id: v.examId,
        year: v.year,
        enabled: v.enabled ?? true,
        sort_order: v.year,
      });
      if (error) throw error;
    },
    onSuccess: () => invalidateTaxonomy(qc),
  });
}

export function useSaveExamYearRow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { id: string; enabled: boolean }) => {
      const { error } = await supabase.from("exam_years").update({ enabled: v.enabled }).eq("id", v.id);
      if (error) throw error;
    },
    onSuccess: () => invalidateTaxonomy(qc),
  });
}

export function useDeleteExamYear() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("exam_years").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidateTaxonomy(qc),
  });
}

export function useDeleteExam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("exams").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidateTaxonomy(qc),
  });
}

export function useSaveMaterialFilter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (f: Partial<MaterialFilter> & { id?: string }) => {
      if (f.id) {
        const { id, ...rest } = f;
        const { error } = await supabase.from("material_filters").update(rest).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("material_filters").insert({
          kind: f.kind ?? "subject",
          name: f.name ?? "New filter",
          sort_order: f.sort_order ?? 100,
          enabled: f.enabled ?? true,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => invalidateTaxonomy(qc),
  });
}

export function useDeleteMaterialFilter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("material_filters").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidateTaxonomy(qc),
  });
}

/* ---------------- safe-delete usage checks ---------------- */

export interface UsageCounts {
  users: number;
  materials: number;
}

export function useExamUsage(examId: string | null) {
  return useQuery({
    queryKey: ["taxonomy", "exam_usage", examId],
    enabled: !!examId,
    queryFn: async (): Promise<UsageCounts> => {
      const { data, error } = await supabase.rpc("admin_exam_usage", { _exam_id: examId! });
      if (error) throw error;
      return (data ?? { users: 0, materials: 0 }) as unknown as UsageCounts;
    },
  });
}

export function useFilterUsage(filterId: string | null) {
  return useQuery({
    queryKey: ["taxonomy", "filter_usage", filterId],
    enabled: !!filterId,
    queryFn: async (): Promise<{ materials: number }> => {
      const { data, error } = await supabase.rpc("admin_filter_usage", { _filter_id: filterId! });
      if (error) throw error;
      return (data ?? { materials: 0 }) as unknown as { materials: number };
    },
  });
}

/** Slugify a display name for new exams. */
export function slugifyExamName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}
