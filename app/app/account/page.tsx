import { cookies } from "next/headers";
import Link from "next/link";
import { removeDevice } from "@/app/(auth)/actions";
import { updateProfile } from "@/app/app/actions";
import { requirePlan } from "@/lib/access";
import { DEVICE_COOKIE, MAX_DEVICES } from "@/lib/limits";
import { inr } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Account" };

const day = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const box = "h-11 w-full rounded-xl border border-line bg-white/[0.03] px-3.5 text-[15px] outline-none focus:border-warm";

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const access = await requirePlan();
  const { saved } = await searchParams;
  const supabase = await createClient();
  const [{ data: profile }, { data: devices }, { data: payments }] = await Promise.all([
    supabase.from("profiles").select("full_name,company").maybeSingle(),
    supabase.from("devices").select("id,device_id,label,last_seen_at").order("last_seen_at", { ascending: false }),
    supabase.from("payments").select("id,plan,billing_cycle,amount_inr,method,provider_ref,created_at").order("created_at", { ascending: false }).limit(12),
  ]);
  const thisDevice = (await cookies()).get(DEVICE_COOKIE)?.value;

  return (
    <div className="mx-auto grid max-w-4xl gap-6">
      <h1 className="text-3xl font-semibold tracking-tight">Account</h1>

      <section className="card p-6">
        <h2 className="text-lg font-semibold">Profile</h2>
        <form action={updateProfile} className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm text-mut">
            Name
            <input name="full_name" defaultValue={profile?.full_name ?? access.name} required minLength={2} maxLength={120} className={`${box} mt-1.5`} />
          </label>
          <label className="block text-sm text-mut">
            Company
            <input name="company" defaultValue={profile?.company ?? ""} maxLength={120} className={`${box} mt-1.5`} />
          </label>
          <label className="block text-sm text-mut">
            Email
            <input value={access.email} readOnly className={`${box} mt-1.5 text-dim`} />
          </label>
          <div className="flex items-end gap-3">
            <button type="submit" className="btn-ghost h-11 rounded-xl px-5 text-sm font-medium">
              Save profile
            </button>
            {saved && (
              <span role="status" className="pb-3 text-sm text-ok">
                Saved
              </span>
            )}
          </div>
        </form>
      </section>

      <section className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Plan</h2>
            <p className="mt-1 text-mut">
              <span className="font-medium text-ink">{access.plan.name}</span>
              {access.periodEnd && <> · {access.plan.id === "trial" ? "trial ends" : "renews"} {day(access.periodEnd)}</>}
            </p>
          </div>
          <Link href="/plans" className="btn-hot rounded-xl px-5 py-2.5 text-sm">
            {access.plan.id === "plant" ? "View plans" : "Upgrade"}
          </Link>
        </div>
      </section>

      <section className="card p-6">
        <h2 className="text-lg font-semibold">Devices</h2>
        <p className="mt-1 text-sm text-mut">
          Your account works on up to {MAX_DEVICES} devices, one signed in at a time. Signing in on one signs the other out.
        </p>
        <ul className="mt-5 grid gap-3">
          {(devices ?? []).map((d) => {
            const here = d.device_id === thisDevice;
            return (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line px-4 py-3.5">
                <div>
                  <span className="font-medium">{d.label}</span>
                  {here && <span className="ml-2.5 rounded-full bg-ok/15 px-2 py-0.5 text-xs text-ok">This device</span>}
                  <div className="mt-0.5 text-sm text-dim">Last used {day(d.last_seen_at)}</div>
                </div>
                {!here && (
                  <form action={removeDevice}>
                    <input type="hidden" name="id" value={d.id} />
                    <input type="hidden" name="next" value="account" />
                    <button type="submit" className="btn-ghost rounded-lg px-4 py-2 text-sm text-mut">
                      Remove
                    </button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="card p-6">
        <h2 className="text-lg font-semibold">Payments</h2>
        {payments && payments.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-dim">
                <tr>
                  <th className="pb-2 font-normal">Date</th>
                  <th className="pb-2 font-normal">Plan</th>
                  <th className="pb-2 font-normal">Method</th>
                  <th className="pb-2 font-normal">Reference</th>
                  <th className="pb-2 text-right font-normal">Amount</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-t border-line/70">
                    <td className="py-2.5 text-mut">{day(p.created_at)}</td>
                    <td className="py-2.5 capitalize">
                      {p.plan} <span className="text-dim">· {p.billing_cycle}</span>
                    </td>
                    <td className="py-2.5 capitalize text-mut">{p.method}</td>
                    <td className="py-2.5 font-mono text-xs text-dim">{p.provider_ref.slice(0, 17)}</td>
                    <td className="py-2.5 text-right font-mono tabular-nums">{inr(p.amount_inr)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-xs text-dim">Test mode: these are sample payments. No money was taken.</p>
          </div>
        ) : (
          <p className="mt-2 text-sm text-mut">No payments yet.</p>
        )}
      </section>
    </div>
  );
}
