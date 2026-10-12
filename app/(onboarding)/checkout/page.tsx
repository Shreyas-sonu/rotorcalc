import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckoutForm } from "@/components/app/CheckoutForm";
import { OnboardingShell } from "@/components/app/OnboardingShell";
import { requireSession } from "@/lib/access";
import { payments } from "@/lib/billing/provider";
import { TRIAL_DAYS, getPlan, inr, priceOf, withGst, type Cycle } from "@/lib/plans";

export const metadata = { title: "Checkout" };

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ plan?: string; cycle?: string }> }) {
  const access = await requireSession();
  const params = await searchParams;
  const plan = getPlan(params.plan);
  if (!plan) redirect("/plans");
  const cycle: Cycle = params.cycle === "monthly" ? "monthly" : "yearly";
  const isTrial = plan.id === "trial";
  if (isTrial && access.trialUsed) redirect("/plans");
  const amount = priceOf(plan, cycle);
  const total = withGst(amount);
  const gst = total - amount;

  return (
    <OnboardingShell step={3} email={access.email}>
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <section className="card h-max p-7">
          <div className="text-xs uppercase tracking-[0.14em] text-dim">Your plan</div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{plan.name}</h1>
          <p className="mt-1 text-mut">{plan.blurb}</p>
          <ul className="mt-6 grid gap-2.5 text-sm text-mut">
            {plan.features.map((f) => (
              <li key={f} className="flex gap-3">
                <span className="text-ok">✓</span>
                {f}
              </li>
            ))}
          </ul>
          <dl className="mt-7 grid gap-2.5 border-t border-line pt-5 text-sm">
            {isTrial ? (
              <div className="flex justify-between text-base font-semibold">
                <dt>{TRIAL_DAYS}-day free trial</dt>
                <dd className="font-mono">{inr(0)}</dd>
              </div>
            ) : (
              <>
                <div className="flex justify-between text-mut">
                  <dt>
                    {plan.name}, billed {cycle}
                  </dt>
                  <dd className="font-mono tabular-nums">{inr(amount)}</dd>
                </div>
                <div className="flex justify-between text-mut">
                  <dt>GST 18 %</dt>
                  <dd className="font-mono tabular-nums">{inr(gst)}</dd>
                </div>
                <div className="flex justify-between border-t border-line pt-3 text-base font-semibold">
                  <dt>Total today</dt>
                  <dd className="font-mono tabular-nums">{inr(total)}</dd>
                </div>
              </>
            )}
          </dl>
          <Link href="/plans" className="mt-6 inline-block text-sm text-mut hover:text-ink">
            ← Change plan
          </Link>
        </section>

        <section className="card p-7">
          {payments.testMode && !isTrial && (
            <div className="mb-6 flex items-center gap-3 rounded-xl border border-warm/40 bg-warm/10 px-4 py-3 text-sm text-[#ffd9a3]">
              <span className="rounded bg-warm px-1.5 py-0.5 text-xs font-bold text-[#1a0a02]">TEST MODE</span>
              No money is taken. Use the sample details as they are.
            </div>
          )}
          <h2 className="mb-5 text-xl font-semibold">{isTrial ? "Start your free trial" : "Payment"}</h2>
          <CheckoutForm plan={plan.id} cycle={cycle} isTrial={isTrial} payLabel={isTrial ? `Start ${TRIAL_DAYS}-day trial` : `Pay ${inr(total)}`} />
        </section>
      </div>
    </OnboardingShell>
  );
}
