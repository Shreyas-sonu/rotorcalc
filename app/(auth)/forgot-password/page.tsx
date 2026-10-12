import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";
import { ForgotForm } from "@/components/auth/Forms";

export const metadata = { title: "Reset your password" };

export default function ForgotPage() {
  return (
    <AuthShell
      title="Reset your password"
      lead="Enter your email and we will send you a link to set a new one."
      footer={
        <Link href="/login" className="font-medium text-warm hover:underline">
          ← Back to sign in
        </Link>
      }
    >
      <ForgotForm />
    </AuthShell>
  );
}
