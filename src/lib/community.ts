import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SubmissionStatus = "pending" | "approved" | "rejected";
export type SubmissionKind = "material" | "portal";

export interface CommunitySubmission {
  id: string;
  user_id: string;
  user_email: string;
  kind: SubmissionKind;
  material_name: string;
  description: string;
  link: string;
  credit_name: string;
  status: SubmissionStatus;
  admin_notes: string;
  edited_by_admin: boolean;
  approved_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface NewSubmission {
  material_name: string;
  description: string;
  link: string;
  credit_name: string;
}

export function validateSubmission(v: NewSubmission): string | null {
  const name = v.material_name.trim();
  const desc = v.description.trim();
  const link = v.link.trim();
  const credit = v.credit_name.trim();

  if (name.length < 3) return "Material / portal name must be at least 3 characters";
  if (name.length > 120) return "Material / portal name must be under 120 characters";
  if (desc.length < 20) return "Description must be at least 20 characters";
  if (desc.length > 1000) return "Description must be under 1000 characters";
  if (credit.length < 2) return "Credit name must be at least 2 characters";
  if (credit.length > 60) return "Credit name must be under 60 characters";
  if (!link) return "Please add a link to the resource";
  if (link) {
    try {
      const u = new URL(link);
      if (u.protocol !== "http:" && u.protocol !== "https:") return "Link must start with http:// or https://";
    } catch {
      return "Please enter a valid URL (including https://)";
    }
  }
  return null;
}

/* ---------------- user side ---------------- */

export const mySubmissionsQO = (userId: string | undefined) =>
  queryOptions({
    queryKey: ["community_submissions", "mine", userId ?? "anon"],
    enabled: !!userId,
    queryFn: async (): Promise<CommunitySubmission[]> => {
      const { data, error } = await supabase
        .from("community_submissions")
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CommunitySubmission[];
    },
  });

export function useMySubmissions(userId: string | undefined) {
  return useQuery(mySubmissionsQO(userId));
}

export function useCreateSubmission(userId: string | undefined, email: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: NewSubmission) => {
      const problem = validateSubmission(v);
      if (problem) throw new Error(problem);
      if (!userId) throw new Error("Please sign in to submit");
      const { error } = await supabase.from("community_submissions").insert({
        user_id: userId,
        user_email: email ?? "",
        material_name: v.material_name.trim(),
        description: v.description.trim(),
        link: v.link.trim(),
        credit_name: v.credit_name.trim(),
        status: "pending",
      });
      if (error) throw error;
      await supabase.from("notifications").insert({
        user_id: userId,
        event: "submission_received",
        title: "Submission received",
        body: `“${v.material_name.trim()}” has been sent to the Dypol Admin Team for review.`,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["community_submissions"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

/* ---------------- notifications ---------------- */

export interface Notification {
  id: string;
  user_id: string;
  event: string;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
}

export const notificationsQO = (userId: string | undefined) =>
  queryOptions({
    queryKey: ["notifications", userId ?? "anon"],
    enabled: !!userId,
    queryFn: async (): Promise<Notification[]> => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []) as Notification[];
    },
  });

export function useNotifications(userId: string | undefined) {
  return useQuery(notificationsQO(userId));
}

export function useMarkNotificationsRead(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!userId) return;
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", userId)
        .eq("read", false);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

/* ---------------- admin side ---------------- */

export const allSubmissionsQO = queryOptions({
  queryKey: ["community_submissions", "all"],
  queryFn: async (): Promise<CommunitySubmission[]> => {
    const { data, error } = await supabase
      .from("community_submissions")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as CommunitySubmission[];
  },
});

export function useAllSubmissions() {
  return useQuery(allSubmissionsQO);
}

async function notify(userId: string, event: string, title: string, body: string) {
  await supabase.from("notifications").insert({ user_id: userId, event, title, body });
}

export interface AdminEditInput {
  id: string;
  user_id: string;
  material_name: string;
  description: string;
  link: string;
  credit_name: string;
  kind: SubmissionKind;
}

export function useAdminUpdateSubmission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: AdminEditInput) => {
      const problem = validateSubmission(v);
      if (problem) throw new Error(problem);
      const { error } = await supabase
        .from("community_submissions")
        .update({
          material_name: v.material_name.trim(),
          description: v.description.trim(),
          link: v.link.trim(),
          credit_name: v.credit_name.trim(),
          kind: v.kind,
          edited_by_admin: true,
        })
        .eq("id", v.id);
      if (error) throw error;
      await notify(
        v.user_id,
        "submission_edited",
        "Your submission was edited",
        `An admin edited “${v.material_name.trim()}” before review.`,
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["community_submissions"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export interface ApproveInput {
  submission: CommunitySubmission;
  subject?: string;
  type?: string;
}

export function useApproveSubmission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ submission: s, subject, type }: ApproveInput) => {
      if (s.kind === "portal") {
        const { error } = await supabase.from("portals").insert({
          name: s.material_name,
          description: s.description,
          link: s.link,
          credit_name: s.credit_name,
          sort_order: 1000,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.from("materials").insert({
          tier: "CORE",
          subject: subject ?? "PCM Mix",
          type: type ?? "Notes",
          title: s.material_name,
          description: s.description,
          link: s.link,
          credit_name: s.credit_name,
          sort_order: 1000,
        });
        if (error) throw error;
      }

      const { error: upErr } = await supabase
        .from("community_submissions")
        .update({ status: "approved", approved_at: new Date().toISOString() })
        .eq("id", s.id);
      if (upErr) throw upErr;

      await notify(
        s.user_id,
        "submission_approved",
        "Your submission has been approved.",
        `“${s.material_name}” is now live on Dypol, credited to ${s.credit_name}.`,
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["community_submissions"] });
      qc.invalidateQueries({ queryKey: ["materials"] });
      qc.invalidateQueries({ queryKey: ["portals"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useRejectSubmission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ submission: s, note }: { submission: CommunitySubmission; note: string }) => {
      const { error } = await supabase
        .from("community_submissions")
        .update({ status: "rejected", admin_notes: note.trim().slice(0, 1000) })
        .eq("id", s.id);
      if (error) throw error;
      await notify(
        s.user_id,
        "submission_rejected",
        "Your submission was rejected.",
        note.trim() ? `Reason: ${note.trim()}` : `“${s.material_name}” was not approved.`,
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["community_submissions"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useSoftDeleteSubmission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, restore }: { id: string; restore?: boolean }) => {
      const { error } = await supabase
        .from("community_submissions")
        .update({ deleted_at: restore ? null : new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["community_submissions"] }),
  });
}

export function useHardDeleteSubmission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("community_submissions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["community_submissions"] }),
  });
}
