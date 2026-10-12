import { AuthShell } from "@/components/auth/AuthShell";
import { ResetForm } from "@/components/auth/Forms";
import { requireSession } from "@/lib/access";

export const metadata = { title: "Set a new password" };

export default async function ResetPage() {
  await requireSession();
  return (
    <AuthShell title="Set a new password" lead="Choose a password you do not use anywhere else.">
      <ResetForm />
    </AuthShell>
  );
}
