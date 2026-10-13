import { PowerCalc } from "@/components/calc/PowerCalc";
import { requirePlan } from "@/lib/access";
import { loadSaved } from "@/lib/calculations";
import { getPlan } from "@/lib/plans";

export const metadata = { title: "Power output" };

export default async function PowerPage({ searchParams }: { searchParams: Promise<{ c?: string; welcome?: string }> }) {
  const access = await requirePlan();
  const { c, welcome } = await searchParams;
  const saved = await loadSaved("power", c);
  const started = getPlan(welcome);
  return (
    <>
      {started && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-ok/40 bg-ok/10 px-4 py-3 text-sm text-ok">
          <span aria-hidden="true">✓</span>
          {started.id === "trial" ? "Your free trial has started." : `You are on the ${started.name} plan.`} Change any number below and watch the turbine respond.
        </div>
      )}
      <PowerCalc key={saved?.id ?? "new"} saved={saved} advancedAllowed={access.plan.advancedMode} />
    </>
  );
}
