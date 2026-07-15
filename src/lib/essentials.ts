import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Essential {
  id: string;
  title: string;
  description: string;
  url: string;
  image_url: string | null;
  price: string | null;
  source: string | null;
  sort_order: number;
}

export const essentialsQO = queryOptions({
  queryKey: ["essentials"],
  queryFn: async (): Promise<Essential[]> => {
    const { data, error } = await supabase
      .from("essentials")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Essential[];
  },
});

export function useEssentials() {
  return useQuery(essentialsQO);
}

export function useSaveEssential() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (e: Partial<Essential> & { id?: string }) => {
      if (e.id) {
        const { id, ...rest } = e;
        const { error } = await supabase.from("essentials").update(rest).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("essentials").insert({
          title: e.title ?? "Untitled",
          description: e.description ?? "",
          url: e.url ?? "",
          image_url: e.image_url ?? null,
          price: e.price ?? null,
          source: e.source ?? null,
          sort_order: e.sort_order ?? 1000,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["essentials"] }),
  });
}

export function useDeleteEssential() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("essentials").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["essentials"] }),
  });
}
