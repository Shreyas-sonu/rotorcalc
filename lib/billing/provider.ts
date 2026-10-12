import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Cycle, PlanId } from "@/lib/plans";
import { mockProvider } from "./mock";

export type ChargeInput = {
  plan: PlanId;
  cycle: Cycle;
  /** Rupees, decided on the server from lib/plans.ts. */
  amount: number;
  method: "card" | "upi" | "trial";
};

export type ChargeResult = { ok: true; ref: string } | { ok: false; reason: "trial_used" | "failed" };

export interface PaymentProvider {
  name: string;
  /** True while no money moves. Shown on the checkout screen. */
  testMode: boolean;
  /** Takes the payment and switches the plan on for the signed-in user. */
  charge(supabase: SupabaseClient, input: ChargeInput): Promise<ChargeResult>;
}

// Swap this one line for the real gateway (for example Razorpay) when the app is demo ready.
export const payments: PaymentProvider = mockProvider;
