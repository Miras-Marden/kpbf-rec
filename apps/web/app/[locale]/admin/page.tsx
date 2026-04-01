import Link from "next/link";

export default function AdminSkeletonPage({
  params
}: {
  params: { locale: string };
}) {
  const locale = params.locale;
  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-white/10 bg-white/3 p-4">
        <div className="text-sm font-semibold">Admin area</div>
        <p className="mt-2 text-sm text-white/70">
          Management and moderation workflows will be enabled for users with
          `ADMIN` and `EDITOR` roles.
        </p>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/3 p-4">
        <div className="text-sm font-semibold">Core sections</div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Link
            href="#"
            className="pointer-events-none rounded-xl bg-white/5 p-3 ring-1 ring-white/10"
          >
            <div className="text-xs text-white/60">Moderation queue</div>
            <div className="mt-1 text-sm font-semibold">Pending items</div>
          </Link>
          <Link
            href={`/${locale}/admin/audit-logs`}
            className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10"
          >
            <div className="text-xs text-white/60">Audit</div>
            <div className="mt-1 text-sm font-semibold">Audit logs</div>
          </Link>
          <Link
            href={`/${locale}/admin/fighters`}
            className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10"
          >
            <div className="text-xs text-white/60">Content</div>
            <div className="mt-1 text-sm font-semibold">Fighters</div>
          </Link>
          <Link
            href={`/${locale}/admin/events`}
            className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10"
          >
            <div className="text-xs text-white/60">Content</div>
            <div className="mt-1 text-sm font-semibold">Events</div>
          </Link>
          <Link
            href={`/${locale}/admin/bouts`}
            className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10"
          >
            <div className="text-xs text-white/60">Content</div>
            <div className="mt-1 text-sm font-semibold">Bouts</div>
          </Link>
        </div>
      </section>
    </div>
  );
}

