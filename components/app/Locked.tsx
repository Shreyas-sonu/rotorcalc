import Link from "next/link";
import { inr, type Plan } from "@/lib/plans";

/** Shown in place of a calculator the current plan does not include. */
export function Locked({ title, text, plan, current }: { title: string; text: string; plan: Plan; current: string }) {
  return (
    <div className="mx-auto max-w-2xl py-10 text-center">
      <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-2xl border border-line bg-ink/[0.03] text-2xl">🔒</div>
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="mx-auto mt-3 max-w-lg text-lg text-mut">{text}</p>
      <div className="card mx-auto mt-8 max-w-md p-6 text-left">
        <div className="flex items-baseline justify-between">
          <span className="font-semibold">{plan.name} plan</span>
          <span className="font-mono text-sm text-mut">from {inr(Math.round(plan.yearly / 12))} / month</span>
        </div>
        <ul className="mt-4 grid gap-2 text-sm text-mut">
          {plan.features.map((f) => (
            <li key={f} className="flex gap-2.5">
              <span className="text-ok">✓</span>
              {f}
            </li>
          ))}
        </ul>
        <Link href={`/checkout?plan=${plan.id}&cycle=yearly`} className="btn-spark mt-6 block rounded-xl py-3 text-center text-sm">
          Upgrade to {plan.name}
        </Link>
      </div>
      <p className="mt-4 text-sm text-dim">You are on the {current} plan.</p>
    </div>
  );
}
