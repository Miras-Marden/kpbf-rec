export type AuthUser = {
  sub: string;
  email: string;
  roles: string[];
};

type Listener = () => void;

export type AuthBootstrapStatus = "idle" | "bootstrapping" | "ready";

type State = {
  accessToken: string | null;
  user: AuthUser | null;
  bootstrapStatus: AuthBootstrapStatus;
};

let state: State = {
  accessToken: null,
  user: null,
  bootstrapStatus: "idle"
};

const listeners = new Set<Listener>();

function emit() {
  for (const l of listeners) l();
}

export const auth = {
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getState(): State {
    return state;
  },
  setBootstrapStatus(status: AuthBootstrapStatus) {
    state = { ...state, bootstrapStatus: status };
    emit();
  },
  setAccessToken(token: string | null) {
    state = { ...state, accessToken: token };
    if (!token) state = { ...state, user: null };
    emit();
  },
  setUser(user: AuthUser | null) {
    state = { ...state, user };
    emit();
  },
  clear() {
    // Treat clear as "initialized but unauthenticated" (so route guards don't hang).
    state = { accessToken: null, user: null, bootstrapStatus: "ready" };
    emit();
  }
};

export function getLoginHref(opts?: { locale?: string; nextPath?: string }) {
  const locale = opts?.locale && opts.locale.trim() ? opts.locale : "en";
  const nextPath = opts?.nextPath?.trim();
  const qs = nextPath ? `?next=${encodeURIComponent(nextPath)}` : "";
  return `/${locale}/login${qs}`;
}

