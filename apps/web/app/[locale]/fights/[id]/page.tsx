"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { normalizeLocale } from "@/lib/i18n";
import { ErrorBanner } from "@/ui/ErrorBanner";
import { LoadingState } from "@/ui/LoadingState";

type FightDetail = {
  id: string;
  date: string;
  fighterA: { slug: string; fullName: string };
  fighterB: { slug: string; fullName: string };
  event?: { slug: string; name: string } | null;
  weightCategory?: { name: string } | null;
  venue?: string | null;
  city?: string | null;
  country?: string | null;
  referee?: string | null;
  result: string;
  method: string;
  judgesScores: { id: string; judgeName: string; scoreA: number; scoreB: number }[];
};

export default function FightDetailsPage({
  params
}: {
  params: { locale: string; id: string };
}) {
  const locale = normalizeLocale(params.locale);
  const [fight, setFight] = useState<FightDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const data = await apiFetch<{ fight: FightDetail | null }>({
          path: `/public/fights/${params.id}`
        });
        if (!cancelled) setFight(data.fight);
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
  }, [params.id]);

  return (
    <div className="space-y-4 pb-24">
      {loading ? <LoadingState label="Loading fight..." /> : null}
      {error ? <ErrorBanner message={error} /> : null}

      {!loading && !error && !fight ? (
        <div className="rounded-2xl border border-white/10 bg-white/3 p-4 text-sm text-white/70">
          Fight not found.
        </div>
      ) : null}

      {!loading && !error && fight ? (
        <>
          <section className="rounded-2xl border border-white/10 bg-white/3 p-4">
            <div className="text-xs text-white/60">Fight</div>
            <div className="mt-1 text-lg font-bold leading-tight">
              {fight.fighterA.fullName} vs {fight.fighterB.fullName}
            </div>
            <div className="mt-2 text-sm text-white/70">
              {new Date(fight.date).toLocaleString()} • {fight.method} • {fight.result}
            </div>
            <div className="mt-2 text-xs text-white/60">
              {fight.event ? `Event: ${fight.event.name}` : "No event"}
              {fight.weightCategory?.name ? ` • ${fight.weightCategory.name}` : ""}
            </div>
            <div className="mt-2 text-xs text-white/60">
              {fight.venue ? `Venue: ${fight.venue}` : ""}
              {fight.city ? ` • ${fight.city}` : ""}
              {fight.country ? ` • ${fight.country}` : ""}
            </div>
            {fight.referee ? (
              <div className="mt-2 text-xs text-white/60">Referee: {fight.referee}</div>
            ) : null}
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/3 overflow-hidden">
            <div className="p-3 text-xs text-white/60">Judges</div>
            <div className="space-y-0.5 border-t border-white/10">
              {fight.judgesScores.map((j) => (
                <div key={j.id} className="flex items-center justify-between gap-3 border-b border-white/10 px-3 py-3">
                  <div className="text-sm font-semibold">{j.judgeName}</div>
                  <div className="text-xs text-white/70">
                    A {j.scoreA} — B {j.scoreB}
                  </div>
                </div>
              ))}
              {fight.judgesScores.length === 0 ? (
                <div className="p-4 text-sm text-white/70">No judges scores recorded.</div>
              ) : null}
            </div>
          </section>

          <div className="grid grid-cols-2 gap-3">
            <Link
              href={`/${locale}/fights`}
              className="rounded-xl bg-white/5 px-4 py-2 text-center text-sm font-semibold text-white ring-1 ring-white/10"
            >
              Back to fights
            </Link>
            <Link
              href={`/${locale}/fighters/${fight.fighterA.slug}`}
              className="rounded-xl bg-white/5 px-4 py-2 text-center text-sm font-semibold text-white ring-1 ring-white/10"
            >
              View fighter
            </Link>
          </div>
        </>
      ) : null}
    </div>
  );
}

