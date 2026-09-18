/**
 * Loading placeholders for the feed list.
 */
export function FeedSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-2xl border border-white/8 bg-[var(--surface-elevated)] p-5"
          style={{ animationDelay: `${i * 80}ms` }}
        >
          <div className="flex gap-5">
            <div className="bg-primary/10 size-14 shrink-0 rounded-2xl" />
            <div className="flex flex-1 flex-col gap-3 pt-1">
              <div className="flex gap-2">
                <div className="bg-muted h-6 w-24 rounded-full" />
                <div className="bg-muted h-6 w-20 rounded-full" />
              </div>
              <div className="bg-muted h-5 w-3/4 rounded-lg" />
              <div className="bg-muted h-4 w-full rounded-lg" />
              <div className="bg-muted h-4 w-2/3 rounded-lg" />
              <div className="bg-muted mt-1 h-3 w-48 rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Loading placeholders for post detail.
 */
export function DetailSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="bg-muted h-8 w-2/3 rounded-xl" />
      <div className="bg-muted h-4 w-40 rounded-lg" />
      <div className="bg-muted h-40 w-full rounded-2xl" />
      <div className="bg-muted h-28 w-full rounded-2xl" />
    </div>
  );
}

/**
 * Loading placeholders for roadmap columns.
 */
export function RoadmapSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-3">
          <div className="bg-muted h-7 w-32 rounded-full" />
          <div className="bg-muted h-28 w-full rounded-2xl" />
          <div className="bg-muted h-28 w-full rounded-2xl" />
        </div>
      ))}
    </div>
  );
}
