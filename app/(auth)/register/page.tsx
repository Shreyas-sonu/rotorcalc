import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";
import { RegisterForm } from "@/components/auth/Forms";
import { TRIAL_DAYS, getPlan } from "@/lib/plans";

export const metadata = { title: "Create your account" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ plan?: string; cycle?: string }> }) {
  const { plan, cycle } = await searchParams;
  const chosen = getPlan(plan);
  const query = plan ? `?plan=${encodeURIComponent(plan)}&cycle=${encodeURIComponent(cycle ?? "")}` : "";
  return (
    <AuthShell
      title="Create your account"
      lead={chosen && chosen.id !== "trial" ? `You picked the ${chosen.name} plan. Set up your account, then confirm the plan.` : `Free for ${TRIAL_DAYS} days. No card needed.`}
      footer={
        <>
          Already have an account?{" "}
          <Link href={`/login${query}`} className="font-medium text-warm hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <RegisterForm plan={plan} cycle={cycle} />
    </AuthShell>
  );
}
