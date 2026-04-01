export function LoadingState({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="animate-pulse rounded-lg border border-white/10 bg-white/5 px-3 py-4 text-sm text-white/70">
      {label}
    </div>
  );
}

