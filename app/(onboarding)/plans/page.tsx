import { Notice } from "@/components/auth/Form";
import { OnboardingShell } from "@/components/app/OnboardingShell";
import { Pricing } from "@/components/landing/Pricing";
import { requireSession } from "@/lib/access";

export const metadata = { title: "Choose a plan" };

export default async function PlansPage({ searchParams }: { searchParams: Promise<{ expired?: string }> }) {
  const access = await requireSession();
  const { expired } = await searchParams;
  const first = access.name.split(" ")[0];
  return (
    <OnboardingShell step={2} email={access.email}>
      <div className="mx-auto mb-10 max-w-2xl text-center">
        <h1 className="text-4xl font-semibold tracking-tight">{first ? `${first}, choose your plan` : "Choose your plan"}</h1>
        <p className="mt-3 text-lg text-mut">Start with the free trial or go straight to the full toolkit. You can change plans at any time.</p>
      </div>
      {(expired || (access.plan && !access.planActive)) && (
        <div className="mx-auto mb-8 max-w-2xl">
          <Notice>Your {access.plan?.name ?? "previous"} plan has ended. Choose a plan to get back to your calculators. Your saved calculations are safe.</Notice>
        </div>
      )}
      <Pricing signedIn trialUsed={access.trialUsed} current={access.planActive ? access.plan?.id : undefined} />
    </OnboardingShell>
  );
}
