import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { Cutaway } from "@/components/turbine/Cutaway";

/** Two-column frame for sign in, register and the onboarding steps. */
export function AuthShell({ title, lead, children, footer }: { title: string; lead?: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Link href="/" aria-label="Home">
          <Logo />
        </Link>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          {lead && <p className="mt-2 text-mut">{lead}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-6 text-sm text-mut">{footer}</div>}
        </div>
      </div>
      <div className="relative hidden overflow-hidden border-l border-line bg-panel lg:block">
        <div className="grid-bg absolute inset-0 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_45%,black,transparent)]" />
        <div className="pointer-events-none absolute -left-24 top-24 h-96 w-96 rounded-full bg-hot/20 blur-[120px]" />
        <div className="pointer-events-none absolute -right-24 bottom-24 h-96 w-96 rounded-full bg-cool/15 blur-[120px]" />
        <div className="relative flex h-full flex-col justify-center px-12">
          <Cutaway flow={0.6} heat={0.75} load={0.6} className="w-full" />
          <p className="mt-10 max-w-md text-2xl font-medium leading-snug tracking-tight">
            From gauge readings to a number you can <span className="steam-text">defend.</span>
          </p>
          <p className="mt-3 max-w-md text-mut">Verified IAPWS-IF97 steam properties. Wet exhaust handled exactly. Every input shown on the machine.</p>
        </div>
      </div>
    </div>
  );
}
