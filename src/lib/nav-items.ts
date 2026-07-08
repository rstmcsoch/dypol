import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: string;
  sort_order: number;
  enabled: boolean;
  external: boolean;
}

export const navItemsQO = queryOptions({
  queryKey: ["nav_items"],
  queryFn: async (): Promise<NavItem[]> => {
    const { data, error } = await supabase
      .from("nav_items")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return (data ?? []) as NavItem[];
  },
});

export function useNavItems() {
  return useQuery(navItemsQO);
}

export function useSaveNavItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (n: Partial<NavItem> & { id?: string }) => {
      if (n.id) {
        const { id, ...rest } = n;
        const { error } = await supabase.from("nav_items").update(rest).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("nav_items").insert({
          label: n.label ?? "New",
          href: n.href ?? "/",
          icon: n.icon ?? "Sparkles",
          sort_order: n.sort_order ?? 100,
          enabled: n.enabled ?? true,
          external: n.external ?? false,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["nav_items"] }),
  });
}

export function useDeleteNavItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("nav_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["nav_items"] }),
  });
}
