"use client";

import { PERMISSION_GROUPS } from "@/lib/permissions";

export function PermissionsFields({ selected }: { selected?: string[] }) {
  const set = new Set(selected ?? []);
  return (
    <div className="space-y-5">
      {PERMISSION_GROUPS.map((group) => (
        <div key={group.label}>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-graphite-400">{group.label}</h4>
          <div className="grid gap-2 sm:grid-cols-2">
            {group.items.map((item) => (
              <label key={item.key} className="flex items-center gap-2.5 rounded-lg bg-graphite-50 px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  name="perm"
                  value={item.key}
                  defaultChecked={set.has(item.key)}
                  className="h-4 w-4 rounded border-graphite-300 text-pool-600"
                />
                <span className="text-graphite-700">{item.label}</span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
