"use client";

import { useEffect, useState } from "react";
import { apiFetch, isApiConfigured } from "@/lib/api";
import { ErrorBanner } from "@/ui/ErrorBanner";
import { LoadingState } from "@/ui/LoadingState";

type EventRow = {
  id: string;
  slug: string;
  name: string;
  eventDate?: string | null;
  city?: string | null;
  country?: string | null;
  moderationStatus: "DRAFT" | "PENDING" | "PUBLISHED" | "REJECTED";
  updatedAt: string;
};

export default function AdminEventsPage() {
  const [items, setItems] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");

  async function reload() {
    const data = await apiFetch<{ items: EventRow[] }>({ path: "/admin/events" });
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
        const data = await apiFetch<{ items: EventRow[] }>({ path: "/admin/events" });
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
      path: "/admin/events",
      method: "POST",
      body: {
        name,
        eventDate: eventDate || undefined,
        city: city || undefined,
        country: country || undefined
      }
    });
    setName("");
    setEventDate("");
    setCity("");
    setCountry("");
    await reload();
    setNotice("Event created.");
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
    await apiFetch({ path: `/admin/events/${id}/${verb}`, method: "POST" });
    await reload();
    setNotice(`Event ${verb} OK.`);
    setBusyKey(null);
  }

  return (
    <div className="space-y-4 pb-24">
      <section className="rounded-2xl border border-white/10 bg-white/3 p-4">
        <div className="text-sm font-semibold">Admin: Events</div>
        <p className="mt-2 text-sm text-white/70">
          Create, edit, and moderate event pages.
        </p>
      </section>

      {loading ? <LoadingState label="Loading events..." /> : null}
      {error ? <ErrorBanner message={error} /> : null}
      {notice ? (
        <div className="rounded-2xl border border-white/10 bg-white/3 p-3 text-sm text-white/80">
          {notice}
        </div>
      ) : null}

      <section className="rounded-2xl border border-white/10 bg-white/3 p-4 space-y-3">
        <div className="text-sm font-semibold">Create event</div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Event name"
          className="w-full rounded-xl bg-white/5 px-3 py-2 text-sm ring-1 ring-white/10 placeholder:text-white/40"
        />
        <input
          value={eventDate}
          onChange={(e) => setEventDate(e.target.value)}
          placeholder="Event date (YYYY-MM-DD)"
          className="w-full rounded-xl bg-white/5 px-3 py-2 text-sm ring-1 ring-white/10 placeholder:text-white/40"
        />
        <div className="grid grid-cols-2 gap-2">
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="City"
            className="w-full rounded-xl bg-white/5 px-3 py-2 text-sm ring-1 ring-white/10 placeholder:text-white/40"
          />
          <input
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="Country"
            className="w-full rounded-xl bg-white/5 px-3 py-2 text-sm ring-1 ring-white/10 placeholder:text-white/40"
          />
        </div>
        <button
          type="button"
          onClick={() => create().catch((e) => setError(e instanceof Error ? e.message : "Failed"))}
          className="w-full rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-[#062034] disabled:opacity-50"
          disabled={busyKey === "create" || !name.trim()}
        >
          {busyKey === "create" ? "Creating..." : "Create"}
        </button>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/3 overflow-hidden">
        <div className="p-3 text-xs text-white/60">Recent events</div>
        <div className="space-y-0.5 border-t border-white/10">
          {items.map((e) => (
            <div key={e.id} className="border-b border-white/10 px-3 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{e.name}</div>
                  <div className="mt-1 text-xs text-white/60">
                    {e.moderationStatus} • {new Date(e.updatedAt).toLocaleString()}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => action(e.id, "submit").catch((err) => setError(err instanceof Error ? err.message : "Failed"))}
                    className="rounded-lg bg-white/5 px-3 py-2 text-xs ring-1 ring-white/10"
                    disabled={busyKey === `submit:${e.id}`}
                  >
                    {busyKey === `submit:${e.id}` ? "Submitting..." : "Submit"}
                  </button>
                  <button
                    type="button"
                    onClick={() => action(e.id, "publish").catch((err) => setError(err instanceof Error ? err.message : "Failed"))}
                    className="rounded-lg bg-white/5 px-3 py-2 text-xs ring-1 ring-white/10"
                    disabled={busyKey === `publish:${e.id}`}
                  >
                    {busyKey === `publish:${e.id}` ? "Publishing..." : "Publish"}
                  </button>
                  <button
                    type="button"
                    onClick={() => action(e.id, "reject").catch((err) => setError(err instanceof Error ? err.message : "Failed"))}
                    className="rounded-lg bg-white/5 px-3 py-2 text-xs ring-1 ring-white/10"
                    disabled={busyKey === `reject:${e.id}`}
                  >
                    {busyKey === `reject:${e.id}` ? "Rejecting..." : "Reject"}
                  </button>
                </div>
              </div>
            </div>
          ))}
          {items.length === 0 && !loading ? (
            <div className="p-4 text-sm text-white/70">No events yet.</div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

