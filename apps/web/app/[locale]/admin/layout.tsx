"use client";

import type { ReactNode } from "react";
import { RequireAuth, RequireRole } from "@/ui/AuthGate";

export default function AdminLayout({
  children,
  params
}: {
  children: ReactNode;
  params: { locale: string };
}) {
  return (
    <RequireAuth locale={params.locale}>
      <RequireRole allow={["ADMIN", "EDITOR"]}>{children}</RequireRole>
    </RequireAuth>
  );
}

