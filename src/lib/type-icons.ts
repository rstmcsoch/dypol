import { BookOpen, FileText, Sparkles, Clock, ClipboardList, GraduationCap } from "lucide-react";

/** Icon per resource type, shared by the materials page and cards. */
export const TYPE_ICONS: Record<string, typeof BookOpen> = {
  Books: BookOpen,
  Notes: FileText,
  "Crux / Summary": Sparkles,
  PYQs: Clock,
  "Test Series": ClipboardList,
  "Coaching Modules": GraduationCap,
};
