"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch, isApiConfigured } from "@/lib/api";
import { ErrorBanner } from "@/ui/ErrorBanner";
import { LoadingState } from "@/ui/LoadingState";

type FighterDetail = {
  id: string;
  slug: string;
  fullName: string;
  photoUrl?: string | null;
  dateOfBirth?: string | null;
  nationality?: string | null;
  regionCity?: string | null;
  heightCm?: number | null;
  reachCm?: number | null;
  stance?: string | null;
  weightCategory?: { slug: string; name: string } | null;
  record?: { wins: number; losses: number; draws: number; nc: number } | null;
  lastFights?: Array<{
    id: string;
    date: string;
    opponentName: string;
    result: string;
    method: string;
    event?: { name: string } | null;
  }>;
};

export default function FighterDetailPage({
  params
}: {
  params: { locale: string; slug: string };
}) {
  const { locale, slug } = params;

  const [data, setData] = useState<FighterDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!isApiConfigured()) {
        if (!cancelled) {
          setLoading(false);
          setData(null);
          setError(null);
        }
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await apiFetch<{ fighter: FighterDetail }>({
          path: `/public/fighters/${slug}`
        });
        if (!cancelled) setData(res.fighter);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load fighter");
          setData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Link
          href={`/${locale}/fighters`}
          className="rounded-xl bg-white/5 px-3 py-2 text-sm font-semibold text-white ring-1 ring-white/10"
        >
          Back
        </Link>
        <div className="text-xs text-white/60">Fighter profile</div>
      </div>

      {loading ? <LoadingState label="Loading fighter..." /> : null}
      {error ? <ErrorBanner message={error} /> : null}

      {data ? (
        <>
          <section className="rounded-2xl border border-white/10 bg-white/3 p-4">
            <div className="flex items-start gap-4">
              <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-white/5 ring-1 ring-white/10">
                {data.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={data.photoUrl}
                    alt={data.fullName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="grid h-full w-full place-items-center text-xs font-semibold text-white/40">
                    Photo
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-lg font-bold">{data.fullName}</div>
                <div className="mt-1 text-sm text-white/70">
                  {data.nationality ?? "Kazakhstan"}
                  {data.regionCity ? ` • ${data.regionCity}` : ""}
                </div>
                <div className="mt-2 text-xs text-white/60">
                  Weight: {data.weightCategory ? data.weightCategory.name : "—"}
                </div>
                {data.dateOfBirth ? (
                  <div className="mt-1 text-xs text-white/60">
                    Born: {new Date(data.dateOfBirth).toLocaleDateString()}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-4 gap-2">
              <div className="rounded-xl border border-white/10 bg-white/5 p-2 text-center">
                <div className="text-[11px] text-white/60">W</div>
                <div className="text-sm font-semibold">
                  {data.record?.wins ?? "—"}
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-2 text-center">
                <div className="text-[11px] text-white/60">L</div>
                <div className="text-sm font-semibold">
                  {data.record?.losses ?? "—"}
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-2 text-center">
                <div className="text-[11px] text-white/60">D</div>
                <div className="text-sm font-semibold">
                  {data.record?.draws ?? "—"}
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-2 text-center">
                <div className="text-[11px] text-white/60">NC</div>
                <div className="text-sm font-semibold">
                  {data.record?.nc ?? "—"}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/3 p-4">
            <div className="text-sm font-semibold">Last fights</div>
            <div className="mt-3 space-y-2">
              {data.lastFights?.length ? (
                data.lastFights.map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-3"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">
                        vs {f.opponentName}
                      </div>
                      <div className="mt-1 text-xs text-white/60">
                        {new Date(f.date).toLocaleDateString()}
                        {f.event?.name ? ` • ${f.event.name}` : ""}
                      </div>
                    </div>
                    <div className="text-right text-xs text-white/80">
                      <div className="font-semibold">{f.result}</div>
                      <div className="text-white/60">{f.method}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-white/60">No fights yet.</div>
              )}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}

