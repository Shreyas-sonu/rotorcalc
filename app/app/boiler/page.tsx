import { Locked } from "@/components/app/Locked";
import { BoilerCalc } from "@/components/calc/BoilerCalc";
import { canUse, requirePlan } from "@/lib/access";
import { loadSaved, planFor } from "@/lib/calculations";

export const metadata = { title: "Boiler" };

export default async function BoilerPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const access = await requirePlan();
  if (!canUse(access.plan, "boiler"))
    return <Locked title="Boiler calculator" text="Steam generation from bagasse, rice husk, coal or any blend, on calorific value and boiler efficiency." plan={planFor("boiler")} current={access.plan.name} />;
  const saved = await loadSaved("boiler", (await searchParams).c);
  return <BoilerCalc key={saved?.id ?? "new"} saved={saved} />;
}
