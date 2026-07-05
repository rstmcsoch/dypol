// Local-only user profile (localStorage). Can be swapped for Lovable Cloud auth later.
const KEY = "dypol-user";

export interface DypolUser {
  displayName: string;
  target: string;
  avatarDataUrl?: string;
  isGuest: boolean;
  createdAt: string;
}

export function getUser(): DypolUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as DypolUser) : null;
  } catch {
    return null;
  }
}

export function saveUser(u: DypolUser) {
  localStorage.setItem(KEY, JSON.stringify(u));
  window.dispatchEvent(new Event("dypol-user-change"));
}

export function clearUser() {
  localStorage.removeItem(KEY);
  window.dispatchEvent(new Event("dypol-user-change"));
}
