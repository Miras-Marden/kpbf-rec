"use client";

import { useEffect, useState } from "react";
import { apiFetch, isApiConfigured } from "@/lib/api";
import { ErrorBanner } from "@/ui/ErrorBanner";
import { LoadingState } from "@/ui/LoadingState";

type AuditLogRow = {
  id: string;
  createdAt: string;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  note?: string | null;
};

export default function AuditLogsPage({
  params
}: {
  params: { locale: string };
}) {
  const [rows, setRows] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Auth token will be added when we wire auth to the client.
  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!isApiConfigured()) {
        if (!cancelled) {
          setLoading(false);
          setRows([]);
          setError(null);
        }
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const data = await apiFetch<{ items: AuditLogRow[] }>({
          path: `/admin/audit-logs`
        });
        if (!cancelled) setRows(data.items);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-white/10 bg-white/3 p-4">
        <div className="text-sm font-semibold">Audit logs</div>
        <p className="mt-2 text-sm text-white/70">
          Track administrative actions and moderation changes.
        </p>
      </section>

      {loading ? <LoadingState label="Loading audit logs..." /> : null}
      {error ? <ErrorBanner message={error} /> : null}

      {!loading && !error ? (
        <div className="rounded-2xl border border-white/10 bg-white/3 overflow-hidden">
          <div className="p-3 text-xs text-white/60">Recent actions</div>
          <div className="space-y-0.5 border-t border-white/10">
            {rows.slice(0, 20).map((r) => (
              <div
                key={r.id}
                className="flex items-start justify-between gap-3 border-b border-white/10 px-3 py-3"
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold">{r.action}</div>
                  <div className="mt-1 text-xs text-white/60">
                    {new Date(r.createdAt).toLocaleString()}
                    {r.entityType && r.entityId ? ` • ${r.entityType}:${r.entityId}` : ""}
                  </div>
                  {r.note ? (
                    <div className="mt-1 text-xs text-white/70">{r.note}</div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
          {rows.length === 0 ? (
            <div className="p-4 text-sm text-white/60">No audit logs yet.</div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

