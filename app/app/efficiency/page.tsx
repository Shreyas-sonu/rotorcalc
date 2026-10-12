import { Locked } from "@/components/app/Locked";
import { EfficiencyCalc } from "@/components/calc/EfficiencyCalc";
import { canUse, requirePlan } from "@/lib/access";
import { loadSaved, planFor } from "@/lib/calculations";

export const metadata = { title: "Efficiency" };

export default async function EfficiencyPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const access = await requirePlan();
  if (!canUse(access.plan, "efficiency"))
    return <Locked title="Efficiency calculator" text="Find isentropic and overall efficiency from your outlet temperature and generator readings." plan={planFor("efficiency")} current={access.plan.name} />;
  const saved = await loadSaved("efficiency", (await searchParams).c);
  return <EfficiencyCalc key={saved?.id ?? "new"} saved={saved} />;
}
