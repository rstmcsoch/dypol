interface PostgrestErrorLike {
  code?: string | null;
}

/**
 * During the production rollout, the frontend can briefly arrive before the
 * additive catalog-view migration. Only that exact missing-relation condition
 * may use the legacy catalog query; all other errors must remain visible.
 */
export function isCatalogRelationMissing(error: PostgrestErrorLike | null | undefined): boolean {
  return error?.code === "PGRST205" || error?.code === "42P01";
}
