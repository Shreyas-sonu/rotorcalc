import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";
import { Notice } from "@/components/auth/Form";
import { LoginForm } from "@/components/auth/Forms";

export const metadata = { title: "Sign in" };

const REASONS: Record<string, string> = {
  replaced: "You were signed out because this account signed in on another device. Only one session can be active at a time.",
  link: "That link has expired or was already used. Sign in, or ask for a new one.",
  error: "We could not start your session. Please sign in again.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ reason?: string; plan?: string; cycle?: string }> }) {
  const { reason, plan, cycle } = await searchParams;
  const query = plan ? `?plan=${encodeURIComponent(plan)}&cycle=${encodeURIComponent(cycle ?? "")}` : "";
  return (
    <AuthShell
      title="Welcome back"
      lead="Sign in to your calculators."
      footer={
        <>
          New here?{" "}
          <Link href={`/register${query}`} className="font-medium text-brand hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      {reason && REASONS[reason] && (
        <div className="mb-5">
          <Notice>{REASONS[reason]}</Notice>
        </div>
      )}
      <LoginForm plan={plan} cycle={cycle} />
    </AuthShell>
  );
}
