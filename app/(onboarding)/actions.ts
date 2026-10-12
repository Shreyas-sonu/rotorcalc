"use server";

import { redirect } from "next/navigation";
import { requireSession } from "@/lib/access";
import { payments } from "@/lib/billing/provider";
import { getPlan, priceOf, withGst, type Cycle } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";

export type PayState = { error?: string };

export async function pay(_: PayState, form: FormData): Promise<PayState> {
  await requireSession();
  const plan = getPlan(String(form.get("plan") ?? ""));
  if (!plan) return { error: "Pick a plan first." };
  const cycle: Cycle = form.get("cycle") === "monthly" ? "monthly" : "yearly";
  const isTrial = plan.id === "trial";
  const method = isTrial ? "trial" : form.get("method") === "upi" ? "upi" : "card";
  const supabase = await createClient();
  // The amount always comes from the plan table on the server, never from the browser.
  const result = await payments.charge(supabase, { plan: plan.id, cycle, amount: withGst(priceOf(plan, cycle)), method });
  if (!result.ok) {
    return { error: result.reason === "trial_used" ? "This account has already used its free trial. Choose Pro or Plant to continue." : "The payment did not go through. Try again." };
  }
  redirect(`/app?welcome=${plan.id}`);
}
