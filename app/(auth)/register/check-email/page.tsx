import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";

export const metadata = { title: "Check your email" };

export default async function CheckEmailPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email } = await searchParams;
  return (
    <AuthShell
      title="Check your email"
      lead={`We sent a confirmation link to ${email ?? "your email address"}. Open it on this device to finish setting up.`}
      footer={
        <>
          Already confirmed?{" "}
          <Link href="/login" className="font-medium text-warm hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <ul className="grid gap-3 text-sm text-mut">
        <li>• The link works for one hour.</li>
        <li>• Not there? Look in spam or promotions.</li>
        <li>• Used the wrong address? Go back and register again.</li>
      </ul>
    </AuthShell>
  );
}
