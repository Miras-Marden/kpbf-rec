export type AuthUser = {
  sub: string;
  email: string;
  roles: string[];
};

type Listener = () => void;

type State = {
  accessToken: string | null;
  user: AuthUser | null;
};

const STORAGE_KEY = "kpbf.accessToken";

let state: State = {
  accessToken: null,
  user: null
};

const listeners = new Set<Listener>();

function emit() {
  for (const l of listeners) l();
}

function readStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const t = window.localStorage.getItem(STORAGE_KEY);
    return t && t.trim() ? t : null;
  } catch {
    return null;
  }
}

function writeStoredToken(token: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (!token) window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, token);
  } catch {
    // ignore
  }
}

export const auth = {
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getState(): State {
    if (typeof window !== "undefined" && state.accessToken === null) {
      const stored = readStoredToken();
      if (stored) state = { ...state, accessToken: stored };
    }
    return state;
  },
  setAccessToken(token: string | null) {
    state = { ...state, accessToken: token };
    writeStoredToken(token);
    if (!token) state = { ...state, user: null };
    emit();
  },
  setUser(user: AuthUser | null) {
    state = { ...state, user };
    emit();
  },
  clear() {
    state = { accessToken: null, user: null };
    writeStoredToken(null);
    emit();
  }
};

export function getLoginHref(opts?: { locale?: string; nextPath?: string }) {
  const locale = opts?.locale && opts.locale.trim() ? opts.locale : "en";
  const nextPath = opts?.nextPath?.trim();
  const qs = nextPath ? `?next=${encodeURIComponent(nextPath)}` : "";
  return `/${locale}/login${qs}`;
}

