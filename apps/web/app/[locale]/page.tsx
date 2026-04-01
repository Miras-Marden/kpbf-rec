import Link from "next/link";
import { normalizeLocale } from "@/lib/i18n";

export default function HomePage({
  params
}: {
  params: { locale: string };
}) {
  const locale = normalizeLocale(params.locale);

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-brand-500/20 to-transparent p-5">
        <div className="pointer-events-none absolute inset-0 opacity-30">
          <div className="absolute -left-10 -top-10 h-48 w-48 rounded-full bg-brand-500/40 blur-2xl" />
          <div className="absolute -bottom-14 -right-14 h-56 w-56 rounded-full bg-brand-400/30 blur-2xl" />
        </div>
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-white/5 ring-1 ring-white/10">
              <span className="text-lg font-black tracking-tight">KPBF</span>
            </div>
            <div>
              <div className="text-sm text-white/70">Kazakhstan Boxing Federation</div>
              <h1 className="text-2xl font-bold leading-tight">KPBF REC</h1>
            </div>
          </div>

          <p className="mt-3 text-sm leading-relaxed text-white/75">
            An online database of Kazakhstani boxing: fighters, bouts, events,
            and transparent rankings.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href={`/${locale}/fighters`}
              className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-[#062034]"
            >
              Explore fighters
            </Link>
            <Link
              href={`/${locale}/events`}
              className="rounded-xl bg-white/5 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/10"
            >
              Browse events
            </Link>
            <Link
              href={`/${locale}/methodology`}
              className="rounded-xl bg-white/5 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/10"
            >
              Rankings methodology
            </Link>
            <Link
              href={`/${locale}/rankings`}
              className="rounded-xl bg-white/5 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/10"
            >
              Current rankings
            </Link>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/3 p-4">
        <div className="text-sm font-semibold">Quick entry points</div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Link
            href={`/${locale}/fighters`}
            className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10"
          >
            <div className="text-xs text-white/60">Database</div>
            <div className="mt-1 text-sm font-semibold">Fighters</div>
          </Link>
          <Link
            href={`/${locale}/events`}
            className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10"
          >
            <div className="text-xs text-white/60">Cards</div>
            <div className="mt-1 text-sm font-semibold">Events</div>
          </Link>
          <Link
            href={`/${locale}/fights`}
            className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10"
          >
            <div className="text-xs text-white/60">Results</div>
            <div className="mt-1 text-sm font-semibold">Fights</div>
          </Link>
          <Link
            href={`/${locale}/methodology`}
            className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10"
          >
            <div className="text-xs text-white/60">Transparent</div>
            <div className="mt-1 text-sm font-semibold">Ranking system</div>
          </Link>
          <Link
            href={`/${locale}/rankings`}
            className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10"
          >
            <div className="text-xs text-white/60">Leaderboard</div>
            <div className="mt-1 text-sm font-semibold">Rankings</div>
          </Link>
        </div>
      </section>
    </div>
  );
}

