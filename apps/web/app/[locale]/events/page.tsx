"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch, isApiConfigured } from "@/lib/api";
import { normalizeLocale } from "@/lib/i18n";
import { ErrorBanner } from "@/ui/ErrorBanner";
import { LoadingState } from "@/ui/LoadingState";
import { AnimatePresence } from "framer-motion";
import { RevealItem, RevealList } from "@/ui/motion/Reveal";

type EventSummary = {
  id: string;
  slug: string;
  name: string;
  eventDate?: string | null;
  city?: string | null;
  country?: string | null;
};

export default function EventsListPage({ params }: { params: { locale: string } }) {
  const locale = normalizeLocale(params.locale);
  const [items, setItems] = useState<EventSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        const data = await apiFetch<{ items: EventSummary[] }>({
          path: "/public/events"
        });
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

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-white/10 bg-white/3 p-4">
        <div className="text-sm font-semibold">Events</div>
        <p className="mt-2 text-sm text-white/70">
          Published events and their fight cards.
        </p>
      </section>

      {loading ? <LoadingState label="Loading events..." /> : null}
      {error ? <ErrorBanner message={error} /> : null}

      {!loading && !error && items.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/3 p-4 text-sm text-white/70">
          No events yet.
        </div>
      ) : null}

      <AnimatePresence mode="popLayout" initial={false}>
        {!loading && !error ? (
          <RevealList>
            <div className="space-y-3 pb-24">
              {items.map((e) => (
                <RevealItem key={e.id}>
                  <Link
                    href={`/${locale}/events/${e.slug}`}
                    className="block rounded-2xl border border-white/10 bg-white/2 p-4 ring-1 ring-white/5"
                  >
                    <div className="text-sm font-semibold">{e.name}</div>
                    <div className="mt-1 text-xs text-white/60">
                      {e.eventDate ? new Date(e.eventDate).toLocaleDateString() : "Date TBA"}
                      {e.city ? ` • ${e.city}` : ""}
                      {e.country ? ` • ${e.country}` : ""}
                    </div>
                  </Link>
                </RevealItem>
              ))}
            </div>
          </RevealList>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

