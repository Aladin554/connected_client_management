import api from "../api/axios";

export type Me = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role_id: number;
  can_create_users?: number;
  panel_permission?: number;
};

const SESSION_KEY = "user";

export function readMeFromSession(): Partial<Me> | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function writeMeToSession(me: unknown) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(me));
  } catch {
    // ignore storage write failures (private mode, quota, etc.)
  }
}

let mePromise: Promise<Me> | null = null;

export async function getMeCached(options?: { force?: boolean }): Promise<Me> {
  const force = options?.force === true;

  if (!force) {
    const stored = readMeFromSession();
    if (stored?.id && stored?.first_name && stored?.role_id !== undefined) {
      return stored as Me;
    }
  }

  if (force || !mePromise) {
    mePromise = api.get("/me").then((res) => res.data);
  }

  const me = await mePromise;
  writeMeToSession(me);
  return me;
}

export function clearMeCache() {
  mePromise = null;
}

