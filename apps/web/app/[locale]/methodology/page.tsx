import Link from "next/link";

export default function MethodologyPage({
  params
}: {
  params: { locale: string };
}) {
  const locale = params.locale;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold">Rankings methodology</div>
        <Link
          href={`/${locale}/fighters`}
          className="rounded-xl bg-white/5 px-3 py-2 text-sm font-semibold text-white ring-1 ring-white/10"
        >
          Browse
        </Link>
      </div>

      <section className="rounded-2xl border border-white/10 bg-white/3 p-4">
        <h1 className="text-lg font-bold">Explainable Elo-inspired rating</h1>
        <p className="mt-2 text-sm leading-relaxed text-white/75">
          KPBF REC computes ratings from published bouts only, using transparent
          Elo-inspired components. Stronger opponents matter more, outcome
          matters, method matters, and inactive fighters are treated differently
          in active vs all-time leaderboards.
        </p>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/3 p-4">
        <div className="text-sm font-semibold">Rating formula</div>
        <div className="mt-2 rounded-xl bg-white/5 p-3 text-xs text-white/80 ring-1 ring-white/10">
          R_new = R_old + K × importance × method × (actual - expected)
        </div>
        <p className="mt-2 text-sm text-white/70">
          Expected score uses standard Elo logic:
        </p>
        <div className="mt-2 rounded-xl bg-white/5 p-3 text-xs text-white/80 ring-1 ring-white/10">
          expected = 1 / (1 + 10^((R_opponent - R_player)/400))
        </div>
        <p className="mt-2 text-sm text-white/70">
          Upsets create larger changes because the winner had a lower expected
          score.
        </p>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/3 p-4">
        <div className="text-sm font-semibold">Method multipliers</div>
        <div className="mt-3 space-y-2 text-sm text-white/70">
          <div>• KO: 1.25</div>
          <div>• TKO: 1.20</div>
          <div>• UD: 1.00</div>
          <div>• MD: 0.95</div>
          <div>• SD: 0.90</div>
          <div>• DQ: 0.85</div>
          <div>• Draw: 0.75</div>
          <div>• NC: 0.00 (no rating change)</div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/3 p-4">
        <div className="text-sm font-semibold">Importance and inactivity</div>
        <div className="mt-3 space-y-2 text-sm text-white/70">
          <div>• Bout importance: 1.10 with event, 1.00 standalone</div>
          <div>• Active view applies inactivity penalty after 180 days</div>
          <div>• Penalty rate: 0.03 points/day (capped at 200)</div>
          <div>• All-time view does not apply inactivity penalty</div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/3 p-4">
        <div className="text-sm font-semibold">Example scenarios</div>
        <div className="mt-3 space-y-2 text-sm text-white/70">
          <div>• Lower-rated boxer beats higher-rated boxer by KO: biggest gain</div>
          <div>• Favorite wins by SD: smaller gain than expected</div>
          <div>• Draw between close ratings: small adjustments</div>
          <div>• No Contest: records update, ratings stay unchanged</div>
          <div>• Inactive champion: strong all-time rank, lower active rank</div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/3 p-4">
        <div className="text-sm font-semibold">Auditability</div>
        <p className="mt-2 text-sm leading-relaxed text-white/75">
          Rankings are recalculated when bouts are published. Current rankings
          and timestamped snapshots are both stored, including explanation
          metadata per row so users can inspect record, inactivity effect, and
          final rating logic.
        </p>
      </section>
    </div>
  );
}

