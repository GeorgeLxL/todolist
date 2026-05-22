"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import clsx from "clsx";

function TabGroup({
  options,
  current,
  onPick,
}: {
  options: { value: string; label: string }[];
  current: string;
  onPick: (v: string) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border bg-surface p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onPick(o.value)}
          className={clsx(
            "rounded-md px-3 py-1 text-sm font-medium transition-colors",
            current === o.value
              ? "bg-primary text-primary-fg"
              : "text-muted hover:text-text",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function ViewTabs({ ranges = false }: { ranges?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const filter = sp.get("filter") ?? "all";
  const range = sp.get("range") ?? "week";

  function set(key: string, value: string) {
    const p = new URLSearchParams(sp.toString());
    p.set(key, value);
    router.replace(`${pathname}?${p.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <TabGroup
        current={filter}
        onPick={(v) => set("filter", v)}
        options={[
          { value: "all", label: "All" },
          { value: "undone", label: "Undone" },
          { value: "done", label: "Done" },
        ]}
      />
      {ranges && (
        <TabGroup
          current={range}
          onPick={(v) => set("range", v)}
          options={[
            { value: "day", label: "Day" },
            { value: "week", label: "Week" },
            { value: "month", label: "Month" },
          ]}
        />
      )}
    </div>
  );
}
