"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch, isApiConfigured } from "@/lib/api";
import { normalizeLocale } from "@/lib/i18n";
import { ErrorBanner } from "@/ui/ErrorBanner";
import { LoadingState } from "@/ui/LoadingState";

type FightRow = {
  id: string;
  date: string;
  fighterA: { slug: string; fullName: string };
  fighterB: { slug: string; fullName: string };
  weightCategory?: { name: string } | null;
  result: string;
  method: string;
};

type EventDetail = {
  id: string;
  slug: string;
  name: string;
  eventDate?: string | null;
  city?: string | null;
  country?: string | null;
  fights: FightRow[];
};

export default function EventDetailsPage({
  params
}: {
  params: { locale: string; slug: string };
}) {
  const locale = normalizeLocale(params.locale);
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!isApiConfigured()) {
        if (!cancelled) {
          setLoading(false);
          setEvent(null);
          setError(null);
        }
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const data = await apiFetch<{ event: EventDetail | null }>({
          path: `/public/events/${params.slug}`
        });
        if (!cancelled) setEvent(data.event);
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
  }, [params.slug]);

  return (
    <div className="space-y-4 pb-24">
      {loading ? <LoadingState label="Loading event..." /> : null}
      {error ? <ErrorBanner message={error} /> : null}

      {!loading && !error && !event ? (
        <div className="rounded-2xl border border-white/10 bg-white/3 p-4 text-sm text-white/70">
          Event not found.
        </div>
      ) : null}

      {!loading && !error && event ? (
        <>
          <section className="rounded-2xl border border-white/10 bg-white/3 p-4">
            <div className="text-xs text-white/60">Event</div>
            <div className="mt-1 text-lg font-bold leading-tight">
              {event.name}
            </div>
            <div className="mt-2 text-sm text-white/70">
              {event.eventDate ? new Date(event.eventDate).toLocaleDateString() : "Date TBA"}
              {event.city ? ` • ${event.city}` : ""}
              {event.country ? ` • ${event.country}` : ""}
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/3 overflow-hidden">
            <div className="p-3 text-xs text-white/60">
              Fight card ({event.fights.length})
            </div>
            <div className="space-y-0.5 border-t border-white/10">
              {event.fights.map((f) => (
                <Link
                  key={f.id}
                  href={`/${locale}/fights/${f.id}`}
                  className="block border-b border-white/10 px-3 py-3"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">
                        {f.fighterA.fullName} vs {f.fighterB.fullName}
                      </div>
                      <div className="mt-1 text-xs text-white/60">
                        {f.weightCategory?.name ?? "—"} • {f.method}
                      </div>
                    </div>
                    <div className="text-xs text-white/70">{f.result}</div>
                  </div>
                </Link>
              ))}
              {event.fights.length === 0 ? (
                <div className="p-4 text-sm text-white/70">
                  No published fights for this event yet.
                </div>
              ) : null}
            </div>
          </section>

          <div className="text-center">
            <Link
              href={`/${locale}/events`}
              className="inline-block rounded-xl bg-white/5 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/10"
            >
              Back to events
            </Link>
          </div>
        </>
      ) : null}
    </div>
  );
}

