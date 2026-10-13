"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CALCULATORS, type CalculatorId } from "@/lib/plans";

/** Calculator tabs. Calculators outside the plan stay visible with a lock, so the upgrade path is clear. */
export function AppNav({ allowed }: { allowed: CalculatorId[] }) {
  const path = usePathname();
  const items = [
    ...CALCULATORS.map((c) => ({ href: c.href, label: c.name, locked: !allowed.includes(c.id) })),
    { href: "/app/history", label: "Saved", locked: false },
  ];
  return (
    <nav aria-label="Calculators" className="no-print order-last -mx-1 flex basis-full gap-1 overflow-x-auto px-1 lg:order-none lg:basis-auto">
      {items.map((i) => {
        const current = i.href === "/app" ? path === "/app" : path.startsWith(i.href);
        return (
          <Link
            key={i.href}
            href={i.href}
            aria-current={current ? "page" : undefined}
            className={`relative whitespace-nowrap px-3.5 py-3 text-sm lg:py-4 transition-colors ${current ? "font-medium text-ink" : "text-mut hover:text-ink"}`}
          >
            {i.label}
            {i.locked && <span className="ml-1.5 text-xs opacity-60">🔒</span>}
            {current && <span className="steam-line absolute inset-x-3 bottom-0 h-[2px] rounded-full" />}
          </Link>
        );
      })}
    </nav>
  );
}
