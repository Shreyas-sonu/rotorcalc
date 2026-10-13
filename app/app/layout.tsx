import Link from "next/link";
import { signOut } from "@/app/(auth)/actions";
import { AppNav } from "@/components/app/AppNav";
import { Logo } from "@/components/brand/Logo";
import { requirePlan } from "@/lib/access";
import { TRIAL_DAYS } from "@/lib/plans";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const access = await requirePlan();
  // The server clock is the reference for how long the plan has left.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const daysLeft = access.periodEnd ? Math.max(0, Math.ceil((new Date(access.periodEnd).getTime() - now) / 86_400_000)) : null;
  const isTrial = access.plan.id === "trial";
  const initials =
    (access.name || access.email)
      .split(/[\s@.]+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "U";

  return (
    <div className="flex min-h-screen flex-col">
      <header className="no-print sticky top-0 z-40 border-b border-line bg-bg/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-5">
          <div className="flex min-w-0 items-center gap-6">
            <Link href="/app" aria-label="Calculators home" className="shrink-0">
              <Logo size={24} />
            </Link>
            <AppNav allowed={access.plan.calculators} />
          </div>
          <div className="flex shrink-0 items-center gap-3 text-sm">
            <Link
              href="/plans"
              className={`hidden rounded-full border px-3 py-1 text-xs sm:block ${isTrial ? "border-brand/50 text-brand hover:bg-brand/10" : "border-line text-mut hover:text-ink"}`}
            >
              {isTrial ? `Trial · ${daysLeft} of ${TRIAL_DAYS} days left · Upgrade` : `${access.plan.name} plan`}
            </Link>
            <Link href="/app/account" aria-label="Account" className="grid h-9 w-9 place-items-center rounded-full border border-line bg-ink/[0.04] text-xs font-semibold hover:border-brand/60">
              {initials}
            </Link>
            <form action={signOut}>
              <button type="submit" className="rounded-lg px-2 py-1.5 text-mut hover:text-ink">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1500px] flex-1 px-5 py-8">{children}</main>
    </div>
  );
}
