import { Locked } from "@/components/app/Locked";
import { FlowCalc } from "@/components/calc/FlowCalc";
import { canUse, requirePlan } from "@/lib/access";
import { loadSaved, planFor } from "@/lib/calculations";

export const metadata = { title: "Steam flow" };

export default async function FlowPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const access = await requirePlan();
  if (!canUse(access.plan, "flow"))
    return <Locked title="Steam flow calculator" text="Work out the steam you need at the stop valve to reach a power target." plan={planFor("flow")} current={access.plan.name} />;
  const saved = await loadSaved("flow", (await searchParams).c);
  return <FlowCalc key={saved?.id ?? "new"} saved={saved} />;
}
