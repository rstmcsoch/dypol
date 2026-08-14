// Enums used across the UI. Content lives in Lovable Cloud (materials/portals tables).
// These lists double as fallbacks when the admin-managed taxonomy (public.exams,
// public.material_filters) is temporarily unavailable.

export const RESOURCE_TYPES = [
  "Books",
  "Notes",
  "Crux / Summary",
  "PYQs",
  "Test Series",
  "Coaching Modules",
] as const;

export const SUBJECTS = ["Physics", "Chemistry", "Mathematics", "PCM Mix"] as const;

export const TIERS = ["CORE", "PREMIUM"] as const;
