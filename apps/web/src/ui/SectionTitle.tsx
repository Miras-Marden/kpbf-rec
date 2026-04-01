export function SectionTitle({
  kicker,
  title
}: {
  kicker?: string;
  title: string;
}) {
  return (
    <div className="mb-3">
      {kicker ? (
        <div className="text-xs font-medium tracking-wide text-white/60">
          {kicker}
        </div>
      ) : null}
      <h1 className="text-xl font-semibold">{title}</h1>
    </div>
  );
}

