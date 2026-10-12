import { redirect } from "next/navigation";
import { removeDevice } from "@/app/(auth)/actions";
import { OnboardingShell } from "@/components/app/OnboardingShell";
import { getAccess } from "@/lib/access";
import { MAX_DEVICES } from "@/lib/limits";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Device limit reached" };

export default async function DevicesPage() {
  const access = await getAccess();
  if (!access) redirect("/auth/ended?reason=signin");
  if (access.session === "revoked") redirect("/auth/ended?reason=replaced");
  if (access.session === "active") redirect("/app/account");
  const supabase = await createClient();
  const { data: devices } = await supabase.from("devices").select("id,label,created_at,last_seen_at").order("last_seen_at", { ascending: false });
  if (!devices || devices.length < MAX_DEVICES) redirect("/auth/claim");

  return (
    <OnboardingShell step={1} email={access.email}>
      <div className="mx-auto max-w-xl">
        <h1 className="text-3xl font-semibold tracking-tight">This account is already on {MAX_DEVICES} devices</h1>
        <p className="mt-3 text-mut">
          An account can be used on up to {MAX_DEVICES} devices. To sign in here, remove one below. That device will be signed out.
        </p>
        <ul className="mt-8 grid gap-3">
          {devices.map((d) => (
            <li key={d.id} className="card flex items-center justify-between gap-4 p-5">
              <div>
                <div className="font-medium">{d.label}</div>
                <div className="mt-0.5 text-sm text-dim">
                  Last used {new Date(d.last_seen_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </div>
              </div>
              <form action={removeDevice}>
                <input type="hidden" name="id" value={d.id} />
                <button type="submit" className="btn-ghost rounded-lg px-4 py-2 text-sm font-medium">
                  Remove and sign in here
                </button>
              </form>
            </li>
          ))}
        </ul>
      </div>
    </OnboardingShell>
  );
}
