import { useAuth } from "@/hooks/use-auth";
import { useActivityTracking } from "@/lib/activity";

/**
 * Mounted once at the app root. Starts verified active-time tracking
 * for signed-in users only. Batched heartbeats keep the database
 * write rate negligible (at most ~3 writes/minute/user while active).
 */
export function ActivityTracker() {
  const { user, loading } = useAuth();
  useActivityTracking(loading ? undefined : user?.id);
  return null;
}
