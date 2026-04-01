"use client";

import { useSyncExternalStore } from "react";
import { auth } from "./auth";

export function useAuth() {
  return useSyncExternalStore(auth.subscribe, auth.getState, auth.getState);
}

