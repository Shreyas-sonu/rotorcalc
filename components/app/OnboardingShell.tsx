import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { SignOutButton } from "@/components/ui/SignOutButton";

const STEPS = ["Account", "Plan", "Payment", "Calculate"];

/** Frame for the steps between registering and the first calculation. `step` is 1-based. */
export function OnboardingShell({ step, email, children }: { step: number; email?: string; children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col">
      <div className="grid-bg pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_70%_45%_at_50%_0%,black,transparent)]" />
      <header className="relative mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-6">
        <Link href="/" aria-label="Home">
          <Logo />
        </Link>
        <ol className="hidden items-center gap-3 text-sm md:flex">
          {STEPS.map((s, i) => {
            const n = i + 1;
            const done = n < step;
            const current = n === step;
            return (
              <li key={s} className="flex items-center gap-3">
                <span className={`flex items-center gap-2 ${current ? "text-ink" : done ? "text-ok" : "text-dim"}`}>
                  <span className={`grid h-6 w-6 place-items-center rounded-full border text-xs ${current ? "border-brand text-brand" : done ? "border-ok bg-ok/15" : "border-line"}`}>
                    {done ? "✓" : n}
                  </span>
                  {s}
                </span>
                {n < STEPS.length && <span className="h-px w-8 bg-line" />}
              </li>
            );
          })}
        </ol>
        <div className="flex items-center gap-3 text-sm">
          {email && <span className="hidden text-dim sm:inline">{email}</span>}
          <SignOutButton className="btn-ghost rounded-lg px-3 py-1.5 text-mut" />
        </div>
      </header>
      <main className="relative mx-auto w-full max-w-7xl flex-1 px-5 pb-20 pt-6">{children}</main>
    </div>
  );
}
