import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { BRAND } from "@/lib/brand";

/** Plain page frame for the privacy policy and the terms. */
export function Legal({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <>
      <header className="border-b border-line/70">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-5">
          <Link href="/" aria-label={`${BRAND.name} home`}>
            <Logo />
          </Link>
          <Link href="/login" className="text-sm text-mut hover:text-ink">
            Sign in
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-14">
        <h1 className="text-4xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-3 text-sm text-dim">Last updated {updated}</p>
        <div className="mt-10 grid gap-9">{children}</div>
      </main>
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-3xl flex-wrap gap-x-6 gap-y-2 px-5 py-8 text-sm text-dim">
          <Link href="/" className="hover:text-ink">
            Home
          </Link>
          <Link href="/privacy" className="hover:text-ink">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-ink">
            Terms
          </Link>
          <span className="ml-auto">© 2026 {BRAND.name}</span>
        </div>
      </footer>
    </>
  );
}

export function Clause({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <div className="mt-3 grid gap-3 leading-relaxed text-mut [&_li]:ml-5 [&_li]:list-disc [&_ul]:grid [&_ul]:gap-1.5">{children}</div>
    </section>
  );
}

export function Mail() {
  return (
    <a href={`mailto:${BRAND.supportEmail}`} className="text-brand hover:underline">
      {BRAND.supportEmail}
    </a>
  );
}
