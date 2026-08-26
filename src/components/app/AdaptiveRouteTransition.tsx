"use client";

export function AdaptiveRouteTransition({
  routeKey,
  pace,
  pending,
  children,
}: {
  routeKey: string;
  pace: "fast" | "normal";
  pending: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="leti-route-stage">
      <div
        key={routeKey}
        className={`leti-route-view${pending ? " leti-route-view--pending" : ""}`}
        data-pace={pace}
      >
        {children}
      </div>

      {pending && (
        <div className="leti-route-skeleton" aria-hidden="true">
          <div className="mb-6 space-y-2">
            <div className="h-7 w-44 rounded-lg bg-graphite-200" />
            <div className="h-4 w-full max-w-xl rounded bg-graphite-100" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((item) => (
              <div key={item} className="h-32 rounded-2xl border border-graphite-100 bg-white" />
            ))}
          </div>
          <div className="mt-6 h-64 rounded-2xl border border-graphite-100 bg-white" />
        </div>
      )}
    </div>
  );
}
