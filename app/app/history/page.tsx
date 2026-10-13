import { ConfirmSubmit } from "@/components/ui/Confirm";
import Link from "next/link";
import { deleteCalculation } from "@/app/app/actions";
import { requirePlan } from "@/lib/access";
import { CALCULATORS } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Saved calculations" };

export default async function HistoryPage() {
  const access = await requirePlan();
  const supabase = await createClient();
  const { data } = await supabase.from("calculations").select("id,kind,name,summary,updated_at").order("updated_at", { ascending: false }).limit(300);
  const rows = data ?? [];
  const limit = access.plan.savedLimit;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Saved calculations</h1>
          <p className="mt-1 text-mut">Reopen a calculation to change it, or print it for the file.</p>
        </div>
        <span className="font-mono text-sm text-dim">
          {rows.length} {limit === null ? "saved" : `of ${limit}`}
        </span>
      </div>
      {rows.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-lg font-medium">Nothing saved yet</p>
          <p className="mx-auto mt-2 max-w-sm text-mut">Run a calculation, give it a name and press Save. It will be listed here.</p>
          <Link href="/app" className="btn-spark mt-6 inline-block rounded-xl px-5 py-3 text-sm">
            Open the power calculator
          </Link>
        </div>
      ) : (
        <ul className="grid gap-3">
          {rows.map((r) => {
            const calc = CALCULATORS.find((c) => c.id === r.kind);
            const locked = !access.plan.calculators.includes(r.kind);
            return (
              <li key={r.id} className="card flex flex-wrap items-center justify-between gap-4 p-5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5">
                    <span className="rounded-md border border-line px-2 py-0.5 text-xs text-brand">{calc?.name ?? r.kind}</span>
                    <span className="truncate font-medium">{r.name}</span>
                  </div>
                  <div className="mt-1.5 text-sm text-mut">
                    <span className="font-mono">{r.summary}</span>
                    <span className="ml-3 text-dim">{new Date(r.updated_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {locked ? (
                    <Link href="/plans" className="btn-ghost rounded-lg px-4 py-2 text-sm text-mut">
                      Upgrade to open
                    </Link>
                  ) : (
                    <Link href={`${calc?.href ?? "/app"}?c=${r.id}`} className="btn-ghost rounded-lg px-4 py-2 text-sm font-medium">
                      Open
                    </Link>
                  )}
                  <form action={deleteCalculation}>
                    <input type="hidden" name="id" value={r.id} />
                    <ConfirmSubmit
                      ask={{
                        title: `Delete "${r.name}"?`,
                        text: "The saved calculation is removed for good. This cannot be undone.",
                        confirmLabel: "Delete",
                        tone: "danger",
                        icon: "trash",
                      }}
                      className="rounded-lg px-3 py-2 text-sm text-dim hover:text-bad"
                      aria-label={`Delete ${r.name}`}
                    >
                      Delete
                    </ConfirmSubmit>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
