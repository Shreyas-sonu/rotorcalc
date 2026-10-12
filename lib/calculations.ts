import "server-only";
import { PLANS, type CalculatorId, type Plan } from "./plans";
import { createClient } from "./supabase/server";

export type SavedCalculation = { id: string; name: string; inputs: Record<string, unknown> } | null;

/** The saved calculation named in the address bar (?c=...), if it belongs to this user and calculator. */
export async function loadSaved(kind: CalculatorId, id: string | undefined): Promise<SavedCalculation> {
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("calculations").select("id,name,inputs").eq("id", id).eq("kind", kind).maybeSingle();
  return data ? { id: data.id, name: data.name, inputs: (data.inputs ?? {}) as Record<string, unknown> } : null;
}

/** The cheapest plan that includes a calculator, for the upgrade prompt. */
export function planFor(calculator: CalculatorId): Plan {
  return PLANS.find((p) => p.calculators.includes(calculator)) ?? PLANS[PLANS.length - 1];
}
