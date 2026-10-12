import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import { getPlan, type CalculatorId, type Plan } from "./plans";

export type Access = {
  userId: string;
  email: string;
  name: string;
  /** active: the account's one live session. revoked: ended by a newer sign-in or a removed device. unclaimed: signed in but not registered as the live session. */
  session: "active" | "revoked" | "unclaimed";
  plan: Plan | null;
  planActive: boolean;
  billingCycle: string | null;
  periodEnd: string | null;
  trialUsed: boolean;
};

/** Who is signed in and what they may use. One database round trip per request. */
export const getAccess = cache(async (): Promise<Access | null> => {
  const supabase = await createClient();
  // The token is checked locally here; session_check() below is the authority, verified by the database.
  const { data: auth } = await supabase.auth.getClaims();
  const claims = auth?.claims;
  if (!claims?.sub) return null;
  const { data, error } = await supabase.rpc("session_check");
  // A failed check must not look like "signed out": that would bounce between /login and /app.
  if (error || !data) throw new Error("Could not verify the session.");
  if (data.session === "none") return null;
  return {
    userId: claims.sub,
    email: (claims.email as string | undefined) ?? "",
    name: ((claims.user_metadata as { full_name?: string } | undefined)?.full_name) ?? "",
    session: data.session,
    plan: getPlan(data.plan),
    planActive: !!data.plan_active,
    billingCycle: data.billing_cycle ?? null,
    periodEnd: data.period_end ?? null,
    trialUsed: !!data.trial_used,
  };
});

/** Signed in, and this is the account's live session. Otherwise redirects. */
export async function requireSession(): Promise<Access> {
  const access = await getAccess();
  if (!access) redirect("/auth/ended?reason=signin");
  if (access.session === "revoked") redirect("/auth/ended?reason=replaced");
  if (access.session === "unclaimed") redirect("/auth/claim");
  return access;
}

/** As requireSession, and the account has an active plan. */
export async function requirePlan(): Promise<Access & { plan: Plan }> {
  const access = await requireSession();
  if (!access.plan || !access.planActive) redirect(access.plan ? "/plans?expired=1" : "/plans");
  return access as Access & { plan: Plan };
}

export function canUse(plan: Plan, calculator: CalculatorId): boolean {
  return plan.calculators.includes(calculator);
}
