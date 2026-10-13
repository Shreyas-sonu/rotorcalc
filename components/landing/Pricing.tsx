"use client";

import Link from "next/link";
import { useState } from "react";
import { PLANS, inr, priceOf, type Cycle, type PlanId } from "@/lib/plans";

/** Plan cards with a monthly / yearly switch. Signed-in users go to checkout, visitors to register. */
export function Pricing({ signedIn = false, trialUsed = false, current }: { signedIn?: boolean; trialUsed?: boolean; current?: PlanId }) {
  const [cycle, setCycle] = useState<Cycle>("yearly");
  return (
    <div>
      <div className="mx-auto mb-10 flex w-max items-center gap-1 rounded-full border border-line bg-panel p-1 text-sm shadow-sm">
        {(["monthly", "yearly"] as const).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCycle(c)}
            aria-pressed={cycle === c}
            className={`rounded-full px-4 py-1.5 capitalize transition-colors ${cycle === c ? "bg-ink font-medium text-spark" : "text-mut hover:text-ink"}`}
          >
            {c}
            {c === "yearly" && <span className={`ml-2 text-xs ${cycle === c ? "text-spark" : "text-brand"}`}>2 months free</span>}
          </button>
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        {PLANS.map((plan) => {
          const price = priceOf(plan, cycle);
          const perMonth = cycle === "yearly" ? Math.round(plan.yearly / 12) : plan.monthly;
          const target = signedIn ? `/checkout?plan=${plan.id}&cycle=${cycle}` : `/register?plan=${plan.id}&cycle=${cycle}`;
          return (
            <div key={plan.id} className={`card relative flex flex-col p-7 ${plan.highlight ? "border-[1.5px] border-ink shadow-[7px_7px_0_var(--color-spark)]" : ""}`}>
              {plan.highlight && <span className="absolute -top-3 left-7 rounded-full border-[1.5px] border-ink bg-spark px-3 py-1 text-xs font-semibold text-ink">Most popular</span>}
              <h3 className="text-lg font-semibold">{plan.name}</h3>
              <p className="mt-1 min-h-10 text-sm text-mut">{plan.blurb}</p>
              <div className="mt-5 flex items-baseline gap-1.5">
                <span className="font-mono text-4xl font-semibold tabular-nums tracking-tight">{plan.monthly === 0 ? "Free" : inr(perMonth)}</span>
                {plan.monthly > 0 && <span className="text-sm text-mut">/ month</span>}
              </div>
              <p className="mt-1 h-5 text-xs text-dim">{plan.monthly === 0 ? "14 days, then choose a plan" : cycle === "yearly" ? `${inr(price)} billed yearly` : "billed monthly"}</p>
              {current === plan.id ? (
                <span className="mt-6 rounded-xl border border-ok/40 bg-ok/10 px-5 py-3 text-center text-sm font-medium text-ok">Your current plan</span>
              ) : plan.id === "trial" && trialUsed ? (
                <span className="mt-6 rounded-xl border border-line px-5 py-3 text-center text-sm text-dim">Trial already used</span>
              ) : (
                <Link href={target} className={`mt-6 rounded-xl px-5 py-3 text-center text-sm ${plan.highlight ? "btn-spark" : "btn-ghost font-medium"}`}>
                  {plan.monthly === 0 ? "Start free trial" : `Choose ${plan.name}`}
                </Link>
              )}
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
