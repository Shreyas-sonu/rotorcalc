import "server-only";
import type { PaymentProvider } from "./provider";

/** Pretend gateway: always succeeds, takes no money, and records the "payment" in the database. */
export const mockProvider: PaymentProvider = {
  name: "mock",
  testMode: true,
  async charge(supabase, input) {
    const { data, error } = await supabase.rpc("activate_mock_subscription", {
      p_plan: input.plan,
      p_cycle: input.cycle,
      p_amount_inr: input.amount,
      p_method: input.method,
    });
    if (error || !data) return { ok: false, reason: "failed" };
    if (!data.ok) return { ok: false, reason: data.reason === "trial_used" ? "trial_used" : "failed" };
    return { ok: true, ref: data.ref };
  },
};
