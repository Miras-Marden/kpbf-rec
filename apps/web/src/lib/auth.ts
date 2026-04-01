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

let state: State = {
  accessToken: null,
  user: null
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
    state = { accessToken: null, user: null };
    emit();
  }
};

export function getLoginHref(opts?: { locale?: string; nextPath?: string }) {
  const locale = opts?.locale && opts.locale.trim() ? opts.locale : "en";
  const nextPath = opts?.nextPath?.trim();
  const qs = nextPath ? `?next=${encodeURIComponent(nextPath)}` : "";
  return `/${locale}/login${qs}`;
}

