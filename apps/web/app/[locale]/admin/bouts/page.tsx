"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { ErrorBanner } from "@/ui/ErrorBanner";
import { LoadingState } from "@/ui/LoadingState";

type BoutRow = {
  id: string;
  slug: string;
  boutDate: string;
  fighterA: { id: string; fullName: string };
  fighterB: { id: string; fullName: string };
  event?: { id: string; name: string } | null;
  moderationStatus: "DRAFT" | "PENDING" | "PUBLISHED" | "REJECTED";
  result: string;
  method: string;
  updatedAt: string;
};

type FighterPick = { id: string; fullName: string; moderationStatus: string };
type EventPick = { id: string; name: string; moderationStatus: string };

const OUTCOMES = ["WIN", "LOSS", "DRAW", "NC"] as const;
const METHODS = ["UD", "SD", "MD", "KO", "TKO", "DQ", "Draw", "NC"] as const;

export default function AdminBoutsPage() {
  const [items, setItems] = useState<BoutRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const [fighters, setFighters] = useState<FighterPick[]>([]);
  const [events, setEvents] = useState<EventPick[]>([]);
  const [fighterQuery, setFighterQuery] = useState("");
  const [eventQuery, setEventQuery] = useState("");

  const [fighterAId, setFighterAId] = useState("");
  const [fighterBId, setFighterBId] = useState("");
  const [boutDate, setBoutDate] = useState("");
  const [eventId, setEventId] = useState("");
  const [result, setResult] = useState<(typeof OUTCOMES)[number]>("WIN");
  const [method, setMethod] = useState<(typeof METHODS)[number]>("UD");

  async function reload() {
    const data = await apiFetch<{ items: BoutRow[] }>({ path: "/admin/bouts" });
    setItems(data.items);
  }

  async function reloadLookups() {
    const [f, e] = await Promise.all([
      apiFetch<{ items: any[] }>({ path: "/admin/fighters" }),
      apiFetch<{ items: any[] }>({ path: "/admin/events" })
    ]);
    setFighters(
      (f.items ?? []).map((x) => ({
        id: x.id,
        fullName: x.fullName,
        moderationStatus: x.moderationStatus
      }))
    );
    setEvents(
      (e.items ?? []).map((x) => ({
        id: x.id,
        name: x.name,
        moderationStatus: x.moderationStatus
      }))
    );
  }

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const data = await apiFetch<{ items: BoutRow[] }>({ path: "/admin/bouts" });
        if (!cancelled) setItems(data.items);
        await reloadLookups();
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
    setError(null);
    setNotice(null);
    setBusyKey("create");
    await apiFetch({
      path: "/admin/bouts",
      method: "POST",
      body: {
        fighterAId,
        fighterBId,
        boutDate,
        eventId: eventId || undefined,
        result,
        method
      }
    });
    setFighterAId("");
    setFighterBId("");
    setBoutDate("");
    setEventId("");
    setResult("WIN");
    setMethod("UD");
    await reload();
    setNotice("Bout created.");
    setBusyKey(null);
  }

  async function action(id: string, verb: "submit" | "publish" | "reject") {
    setError(null);
    setNotice(null);
    setBusyKey(`${verb}:${id}`);
    await apiFetch({ path: `/admin/bouts/${id}/${verb}`, method: "POST" });
    await reload();
    setNotice(`Bout ${verb} OK.`);
    setBusyKey(null);
  }

  const filteredFighters = useMemo(() => {
    const q = fighterQuery.trim().toLowerCase();
    if (!q) return fighters;
    return fighters.filter((f) => f.fullName.toLowerCase().includes(q));
  }, [fighterQuery, fighters]);

  const filteredEvents = useMemo(() => {
    const q = eventQuery.trim().toLowerCase();
    if (!q) return events;
    return events.filter((e) => e.name.toLowerCase().includes(q));
  }, [eventQuery, events]);

  return (
    <div className="space-y-4 pb-24">
      <section className="rounded-2xl border border-white/10 bg-white/3 p-4">
        <div className="text-sm font-semibold">Admin: Bouts</div>
        <p className="mt-2 text-sm text-white/70">
          Create, link to events, and run moderation workflow.
        </p>
      </section>

      {loading ? <LoadingState label="Loading bouts..." /> : null}
      {error ? <ErrorBanner message={error} /> : null}
      {notice ? (
        <div className="rounded-2xl border border-white/10 bg-white/3 p-3 text-sm text-white/80">
          {notice}
        </div>
      ) : null}

      <section className="rounded-2xl border border-white/10 bg-white/3 p-4 space-y-3">
        <div className="text-sm font-semibold">Create bout</div>
        <div className="grid grid-cols-1 gap-2">
          <input
            value={fighterQuery}
            onChange={(e) => setFighterQuery(e.target.value)}
            placeholder="Search fighters..."
            className="w-full rounded-xl bg-white/5 px-3 py-2 text-sm ring-1 ring-white/10 placeholder:text-white/40"
          />
          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1">
              <div className="text-xs text-white/60">Fighter A</div>
              <select
                value={fighterAId}
                onChange={(e) => setFighterAId(e.target.value)}
                className="w-full rounded-xl bg-white/5 px-3 py-2 text-sm ring-1 ring-white/10"
              >
                <option value="">Select...</option>
                {filteredFighters.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.fullName} ({f.moderationStatus})
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <div className="text-xs text-white/60">Fighter B</div>
              <select
                value={fighterBId}
                onChange={(e) => setFighterBId(e.target.value)}
                className="w-full rounded-xl bg-white/5 px-3 py-2 text-sm ring-1 ring-white/10"
              >
                <option value="">Select...</option>
                {filteredFighters.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.fullName} ({f.moderationStatus})
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
        <input
          value={boutDate}
          onChange={(e) => setBoutDate(e.target.value)}
          placeholder="boutDate (YYYY-MM-DD)"
          className="w-full rounded-xl bg-white/5 px-3 py-2 text-sm ring-1 ring-white/10 placeholder:text-white/40"
        />
        <div className="grid grid-cols-1 gap-2">
          <input
            value={eventQuery}
            onChange={(e) => setEventQuery(e.target.value)}
            placeholder="Search events (optional)..."
            className="w-full rounded-xl bg-white/5 px-3 py-2 text-sm ring-1 ring-white/10 placeholder:text-white/40"
          />
          <label className="space-y-1">
            <div className="text-xs text-white/60">Event</div>
            <select
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
              className="w-full rounded-xl bg-white/5 px-3 py-2 text-sm ring-1 ring-white/10"
            >
              <option value="">No event</option>
              {filteredEvents.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} ({e.moderationStatus})
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="space-y-1">
            <div className="text-xs text-white/60">Result (A perspective)</div>
            <select
              value={result}
              onChange={(e) => setResult(e.target.value as any)}
              className="w-full rounded-xl bg-white/5 px-3 py-2 text-sm ring-1 ring-white/10"
            >
              {OUTCOMES.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <div className="text-xs text-white/60">Method</div>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as any)}
              className="w-full rounded-xl bg-white/5 px-3 py-2 text-sm ring-1 ring-white/10"
            >
              {METHODS.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button
          type="button"
          onClick={() => create().catch((e) => setError(e instanceof Error ? e.message : "Failed"))}
          className="w-full rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-[#062034] disabled:opacity-50"
          disabled={busyKey === "create" || !fighterAId.trim() || !fighterBId.trim() || !boutDate.trim()}
        >
          {busyKey === "create" ? "Creating..." : "Create"}
        </button>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/3 overflow-hidden">
        <div className="p-3 text-xs text-white/60">Recent bouts</div>
        <div className="space-y-0.5 border-t border-white/10">
          {items.map((b) => (
            <div key={b.id} className="border-b border-white/10 px-3 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">
                    {b.fighterA.fullName} vs {b.fighterB.fullName}
                  </div>
                  <div className="mt-1 text-xs text-white/60">
                    {b.moderationStatus} • {new Date(b.updatedAt).toLocaleString()}
                  </div>
                  <div className="mt-1 text-xs text-white/60">
                    {new Date(b.boutDate).toLocaleDateString()} • {b.method} • {b.result}
                    {b.event ? ` • ${b.event.name}` : ""}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => action(b.id, "submit").catch((err) => setError(err instanceof Error ? err.message : "Failed"))}
                    className="rounded-lg bg-white/5 px-3 py-2 text-xs ring-1 ring-white/10"
                    disabled={busyKey === `submit:${b.id}`}
                  >
                    {busyKey === `submit:${b.id}` ? "Submitting..." : "Submit"}
                  </button>
                  <button
                    type="button"
                    onClick={() => action(b.id, "publish").catch((err) => setError(err instanceof Error ? err.message : "Failed"))}
                    className="rounded-lg bg-white/5 px-3 py-2 text-xs ring-1 ring-white/10"
                    disabled={busyKey === `publish:${b.id}`}
                  >
                    {busyKey === `publish:${b.id}` ? "Publishing..." : "Publish"}
                  </button>
                  <button
                    type="button"
                    onClick={() => action(b.id, "reject").catch((err) => setError(err instanceof Error ? err.message : "Failed"))}
                    className="rounded-lg bg-white/5 px-3 py-2 text-xs ring-1 ring-white/10"
                    disabled={busyKey === `reject:${b.id}`}
                  >
                    {busyKey === `reject:${b.id}` ? "Rejecting..." : "Reject"}
                  </button>
                </div>
              </div>
            </div>
          ))}
          {items.length === 0 && !loading ? (
            <div className="p-4 text-sm text-white/70">No bouts yet.</div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

