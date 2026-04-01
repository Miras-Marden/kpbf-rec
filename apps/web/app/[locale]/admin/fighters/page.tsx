"use client";

import { useEffect, useState } from "react";
import { apiFetch, isApiConfigured } from "@/lib/api";
import { ErrorBanner } from "@/ui/ErrorBanner";
import { LoadingState } from "@/ui/LoadingState";

type FighterRow = {
  id: string;
  slug: string;
  fullName: string;
  nationality?: string | null;
  regionCity?: string | null;
  moderationStatus: "DRAFT" | "PENDING" | "PUBLISHED" | "REJECTED";
  updatedAt: string;
};

export default function AdminFightersPage() {
  const [items, setItems] = useState<FighterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [nationality, setNationality] = useState("Kazakhstan");
  const [regionCity, setRegionCity] = useState("");

  async function reload() {
    if (!isApiConfigured()) {
      setItems([]);
      return;
    }
    const data = await apiFetch<{ items: FighterRow[] }>({ path: "/admin/fighters" });
    setItems(data.items);
  }

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!isApiConfigured()) {
        if (!cancelled) {
          setLoading(false);
          setItems([]);
          setError(null);
        }
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const data = await apiFetch<{ items: FighterRow[] }>({ path: "/admin/fighters" });
        if (!cancelled) setItems(data.items);
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

  async function create() {
    if (!isApiConfigured()) {
      setError("Backend API is not configured (set NEXT_PUBLIC_API_URL).");
      return;
    }
    setError(null);
    setNotice(null);
    setBusyKey("create");
    await apiFetch({
      path: "/admin/fighters",
      method: "POST",
      body: {
        fullName,
        nationality: nationality || undefined,
        regionCity: regionCity || undefined
      }
    });
    setFullName("");
    setNationality("Kazakhstan");
    setRegionCity("");
    await reload();
    setNotice("Fighter created.");
    setBusyKey(null);
  }

  async function action(id: string, verb: "submit" | "publish" | "reject") {
    if (!isApiConfigured()) {
      setError("Backend API is not configured (set NEXT_PUBLIC_API_URL).");
      return;
    }
    setError(null);
    setNotice(null);
    setBusyKey(`${verb}:${id}`);
    await apiFetch({ path: `/admin/fighters/${id}/${verb}`, method: "POST" });
    await reload();
    setNotice(`Fighter ${verb} OK.`);
    setBusyKey(null);
  }

  return (
    <div className="space-y-4 pb-24">
      <section className="rounded-2xl border border-white/10 bg-white/3 p-4">
        <div className="text-sm font-semibold">Admin: Fighters</div>
        <p className="mt-2 text-sm text-white/70">
          Create fighters and run moderation workflow.
        </p>
      </section>

      {loading ? <LoadingState label="Loading fighters..." /> : null}
      {error ? <ErrorBanner message={error} /> : null}
      {notice ? (
        <div className="rounded-2xl border border-white/10 bg-white/3 p-3 text-sm text-white/80">
          {notice}
        </div>
      ) : null}

      <section className="rounded-2xl border border-white/10 bg-white/3 p-4 space-y-3">
        <div className="text-sm font-semibold">Create fighter</div>
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Full name"
          className="w-full rounded-xl bg-white/5 px-3 py-2 text-sm ring-1 ring-white/10 placeholder:text-white/40"
        />
        <div className="grid grid-cols-2 gap-2">
          <input
            value={nationality}
            onChange={(e) => setNationality(e.target.value)}
            placeholder="Nationality"
            className="w-full rounded-xl bg-white/5 px-3 py-2 text-sm ring-1 ring-white/10 placeholder:text-white/40"
          />
          <input
            value={regionCity}
            onChange={(e) => setRegionCity(e.target.value)}
            placeholder="Region / City"
            className="w-full rounded-xl bg-white/5 px-3 py-2 text-sm ring-1 ring-white/10 placeholder:text-white/40"
          />
        </div>
        <button
          type="button"
          onClick={() => create().catch((e) => setError(e instanceof Error ? e.message : "Failed"))}
          className="w-full rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-[#062034] disabled:opacity-50"
          disabled={busyKey === "create" || !fullName.trim()}
        >
          {busyKey === "create" ? "Creating..." : "Create"}
        </button>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/3 overflow-hidden">
        <div className="p-3 text-xs text-white/60">Recent fighters</div>
        <div className="space-y-0.5 border-t border-white/10">
          {items.map((f) => (
            <div key={f.id} className="border-b border-white/10 px-3 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{f.fullName}</div>
                  <div className="mt-1 text-xs text-white/60">
                    {f.moderationStatus} • {new Date(f.updatedAt).toLocaleString()}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => action(f.id, "submit").catch((err) => setError(err instanceof Error ? err.message : "Failed"))}
                    className="rounded-lg bg-white/5 px-3 py-2 text-xs ring-1 ring-white/10"
                    disabled={busyKey === `submit:${f.id}`}
                  >
                    {busyKey === `submit:${f.id}` ? "Submitting..." : "Submit"}
                  </button>
                  <button
                    type="button"
                    onClick={() => action(f.id, "publish").catch((err) => setError(err instanceof Error ? err.message : "Failed"))}
                    className="rounded-lg bg-white/5 px-3 py-2 text-xs ring-1 ring-white/10"
                    disabled={busyKey === `publish:${f.id}`}
                  >
                    {busyKey === `publish:${f.id}` ? "Publishing..." : "Publish"}
                  </button>
                  <button
                    type="button"
                    onClick={() => action(f.id, "reject").catch((err) => setError(err instanceof Error ? err.message : "Failed"))}
                    className="rounded-lg bg-white/5 px-3 py-2 text-xs ring-1 ring-white/10"
                    disabled={busyKey === `reject:${f.id}`}
                  >
                    {busyKey === `reject:${f.id}` ? "Rejecting..." : "Reject"}
                  </button>
                </div>
              </div>
            </div>
          ))}
          {items.length === 0 && !loading ? (
            <div className="p-4 text-sm text-white/70">No fighters yet.</div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

