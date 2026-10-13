import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";
import { GoogleButton, RegisterForm } from "@/components/auth/Forms";
import { googleEnabled } from "@/lib/supabase/providers";
import { TRIAL_DAYS, getPlan } from "@/lib/plans";

export const metadata = { title: "Create your account" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ plan?: string; cycle?: string }> }) {
  const { plan, cycle } = await searchParams;
  const chosen = getPlan(plan);
  const google = await googleEnabled();
  const query = plan ? `?plan=${encodeURIComponent(plan)}&cycle=${encodeURIComponent(cycle ?? "")}` : "";
  return (
    <AuthShell
      title="Create your account"
      lead={chosen && chosen.id !== "trial" ? `You picked the ${chosen.name} plan. Set up your account, then confirm the plan.` : `Free for ${TRIAL_DAYS} days. No card needed.`}
      footer={
        <>
          Already have an account?{" "}
          <Link href={`/login${query}`} className="font-medium text-brand hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      {google && <GoogleButton plan={plan} cycle={cycle}>Sign up with Google</GoogleButton>}
      <RegisterForm plan={plan} cycle={cycle} />
    </AuthShell>
  );
}
