"use client";

import Link from "next/link";

/** Shown when a page cannot be loaded, for example when the database cannot be reached. */
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="grid min-h-screen place-items-center px-6">
      <div className="max-w-md text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Something went wrong</h1>
        <p className="mt-3 text-mut">We could not load this page. Your saved work is safe. Check your connection and try again.</p>
        <div className="mt-7 flex justify-center gap-3">
          <button type="button" onClick={reset} className="btn-spark rounded-xl px-5 py-3 text-sm">
            Try again
          </button>
          <Link href="/" className="btn-ghost rounded-xl px-5 py-3 text-sm font-medium">
            Go to home
          </Link>
        </div>
      </div>
    </div>
  );
}
