"use client";

import { useActionState, useState } from "react";
import { pay, type PayState } from "@/app/(onboarding)/actions";
import { Notice, Submit } from "@/components/auth/Form";

const START: PayState = {};
const box = "h-12 w-full rounded-xl border border-line bg-ink/[0.03] px-4 font-mono text-[15px] outline-none focus:border-warm";

/** Pretend payment form. The card and UPI boxes have no `name`, so nothing typed in them is ever sent. */
export function CheckoutForm({ plan, cycle, isTrial, payLabel }: { plan: string; cycle: string; isTrial: boolean; payLabel: string }) {
  const [state, action] = useActionState(pay, START);
  const [method, setMethod] = useState<"card" | "upi">("card");
  return (
    <form action={action} className="grid gap-5">
      <input type="hidden" name="plan" value={plan} />
      <input type="hidden" name="cycle" value={cycle} />
      <input type="hidden" name="method" value={method} />
      {state.error && <Notice tone="bad">{state.error}</Notice>}
      {!isTrial && (
        <>
          <div className="grid grid-cols-2 gap-2 rounded-xl border border-line bg-ink/[0.02] p-1 text-sm">
            {(["card", "upi"] as const).map((m) => (
              <button key={m} type="button" onClick={() => setMethod(m)} aria-pressed={method === m} className={`rounded-lg py-2.5 transition-colors ${method === m ? "bg-panel shadow-sm font-medium text-ink" : "text-mut hover:text-ink"}`}>
                {m === "card" ? "Card" : "UPI"}
              </button>
            ))}
          </div>
          {method === "card" ? (
            <div className="grid gap-4">
              <label className="block text-sm text-mut">
                Card number
                <input className={`${box} mt-1.5`} defaultValue="4242 4242 4242 4242" inputMode="numeric" autoComplete="off" aria-label="Test card number" />
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label className="block text-sm text-mut">
                  Expiry
                  <input className={`${box} mt-1.5`} defaultValue="12 / 30" autoComplete="off" aria-label="Test card expiry" />
                </label>
                <label className="block text-sm text-mut">
                  CVV
                  <input className={`${box} mt-1.5`} defaultValue="123" autoComplete="off" aria-label="Test card security code" />
                </label>
              </div>
            </div>
          ) : (
            <label className="block text-sm text-mut">
              UPI ID
              <input className={`${box} mt-1.5`} defaultValue="success@testupi" autoComplete="off" aria-label="Test UPI ID" />
            </label>
          )}
        </>
      )}
      <Submit>{payLabel}</Submit>
      <p className="text-center text-xs leading-relaxed text-dim">
        {isTrial ? "No card needed. The trial ends by itself; nothing is charged." : "Test mode: no money is taken, and the details above are not sent or stored."}
      </p>
    </form>
  );
}
