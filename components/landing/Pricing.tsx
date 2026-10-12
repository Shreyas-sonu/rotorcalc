"use client";

import Link from "next/link";
import { useState } from "react";
import { PLANS, inr, priceOf, type Cycle } from "@/lib/plans";

/** Plan cards with a monthly / yearly switch. `hrefFor` decides where each button goes. */
export function Pricing({ signedIn = false }: { signedIn?: boolean }) {
  const [cycle, setCycle] = useState<Cycle>("yearly");
  return (
    <div>
      <div className="mx-auto mb-10 flex w-max items-center gap-1 rounded-full border border-line bg-white/[0.03] p-1 text-sm">
        {(["monthly", "yearly"] as const).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCycle(c)}
            aria-pressed={cycle === c}
            className={`rounded-full px-4 py-1.5 capitalize transition-colors ${cycle === c ? "bg-ink text-bg font-medium" : "text-mut hover:text-ink"}`}
          >
            {c}
            {c === "yearly" && <span className={`ml-2 text-xs ${cycle === c ? "text-hot" : "text-warm"}`}>2 months free</span>}
          </button>
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        {PLANS.map((plan) => {
          const price = priceOf(plan, cycle);
          const perMonth = cycle === "yearly" ? Math.round(plan.yearly / 12) : plan.monthly;
          const target = signedIn ? `/checkout?plan=${plan.id}&cycle=${cycle}` : `/register?plan=${plan.id}&cycle=${cycle}`;
          return (
            <div key={plan.id} className={`card relative flex flex-col p-7 ${plan.highlight ? "border-hot/60 shadow-[0_0_60px_-20px_var(--color-hot)]" : ""}`}>
              {plan.highlight && <span className="steam-line absolute -top-3 left-7 rounded-full px-3 py-1 text-xs font-semibold text-[#1a0a02]">Most popular</span>}
              <h3 className="text-lg font-semibold">{plan.name}</h3>
              <p className="mt-1 min-h-10 text-sm text-mut">{plan.blurb}</p>
              <div className="mt-5 flex items-baseline gap-1.5">
                <span className="font-mono text-4xl font-semibold tabular-nums tracking-tight">{plan.monthly === 0 ? "Free" : inr(perMonth)}</span>
                {plan.monthly > 0 && <span className="text-sm text-mut">/ month</span>}
              </div>
              <p className="mt-1 h-5 text-xs text-dim">{plan.monthly === 0 ? "14 days, then choose a plan" : cycle === "yearly" ? `${inr(price)} billed yearly` : "billed monthly"}</p>
              <Link href={target} className={`mt-6 rounded-xl px-5 py-3 text-center text-sm ${plan.highlight ? "btn-hot" : "btn-ghost font-medium"}`}>
                {plan.monthly === 0 ? "Start free trial" : `Choose ${plan.name}`}
              </Link>
              <ul className="mt-7 grid gap-3 text-sm">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-3 text-mut">
                    <svg width="16" height="16" viewBox="0 0 16 16" className="mt-0.5 shrink-0 text-ok" aria-hidden="true">
                      <path d="M3 8.5l3.2 3L13 4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
      <p className="mt-6 text-center text-xs text-dim">Prices exclude GST. Payments are in test mode during the preview: no money is taken.</p>
    </div>
  );
}
