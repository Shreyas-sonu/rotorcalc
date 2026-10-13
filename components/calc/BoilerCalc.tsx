"use client";

import { useMemo, useState } from "react";
import { FUELS, boiler } from "@/lib/steam/boiler";
import { fromBase } from "@/lib/steam/units";
import { BoilerDiagram, type BoilerPart } from "./BoilerDiagram";
import { Blocked, Figures, Headline, PropTable, Warnings, fmt } from "./Results";
import { Workspace, type Saved } from "./Workspace";
import { PercentField, QuantityField, Step, base, errorsOf, pct, q, type Q } from "./fields";

type FuelRow = { name: string; share: string; cv: string };
type Inputs = { fuels: FuelRow[]; fuelRate: Q; efficiency: string; p: Q; T: Q; Tfw: Q };

const DEFAULTS: Inputs = {
  fuels: FUELS.map((f) => ({ name: f.name, share: String(f.share), cv: String(f.cv) })),
  fuelRate: q(10, "TPH"),
  efficiency: "70",
  p: q(67, "kg/cm²(g)"),
  T: q(485, "°C"),
  Tfw: q(105, "°C"),
};

const small = "h-10 w-full min-w-0 rounded-lg border border-line bg-ink/[0.03] px-3 font-mono text-sm tabular-nums outline-none focus:border-warm";

export function BoilerCalc({ saved }: { saved: Saved }) {
  const [v, setV] = useState<Inputs>(() => ({ ...DEFAULTS, ...((saved?.inputs as Partial<Inputs>) ?? {}) }));
  const [part, setPart] = useState<BoilerPart | null>(null);
  const [step, setStep] = useState(0);
  const set = <K extends keyof Inputs>(k: K, value: Inputs[K]) => setV((p) => ({ ...p, [k]: value }));
  const at = (s: number, p: BoilerPart) => () => {
    setStep(s);
    setPart(p);
  };
  const setFuel = (i: number, patch: Partial<FuelRow>) => set("fuels", v.fuels.map((f, j) => (i === j ? { ...f, ...patch } : f)));

  const result = useMemo(
    () =>
      boiler({
        fuels: v.fuels.map((f) => ({ name: f.name, share: Number.parseFloat(f.share) || 0, cv: Number.parseFloat(f.cv) || 0 })),
        fuelRate: base("flow", v.fuelRate),
        efficiency: pct(v.efficiency),
        p: base("pressure", v.p),
        T: base("temperature", v.T),
        Tfw: base("temperature", v.Tfw),
      }),
    [v],
  );
  const err = errorsOf(result);
  const tph = result.ok ? fromBase("flow", "TPH", result.steam) : 0;
  const total = v.fuels.reduce((a, f) => a + (Number.parseFloat(f.share) || 0), 0);
  const fuelKg = base("flow", v.fuelRate);

  return (
    <Workspace
      kind="boiler"
      title="Boiler"
      lead="Steam generation from a fuel mix, on calorific value and boiler efficiency."
      saved={saved}
      inputs={v}
      summary={result.ok ? `${fmt(tph, 2)} TPH steam from ${v.fuelRate.v} ${v.fuelRate.u} fuel` : ""}
      canSave={result.ok}
      form={
        <>
          <section className={`card p-5 transition-colors sm:p-6 ${step === 1 ? "border-warm/50" : ""}`}>
            <header className="mb-5 flex items-center gap-3">
              <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border font-mono text-xs ${step === 1 ? "border-warm text-warm" : "border-line text-dim"}`}>1</span>
              <div>
                <h2 className="font-semibold leading-tight">Fuel mix</h2>
                <p className="text-xs text-dim">Share of each fuel by weight, and its gross calorific value</p>
              </div>
            </header>
            <div className="grid gap-2.5">
              <div className="grid grid-cols-[minmax(0,1fr)_88px_120px] gap-2.5 text-xs text-dim">
                <span>Fuel</span>
                <span>Share %</span>
                <span>CV kJ/kg</span>
              </div>
              {v.fuels.map((f, i) => {
                const used = (Number.parseFloat(f.share) || 0) > 0;
                return (
                  <div key={f.name} className="grid grid-cols-[minmax(0,1fr)_88px_120px] items-center gap-2.5">
                    <span className={`truncate text-sm ${used ? "text-ink" : "text-dim"}`}>{f.name}</span>
                    <input type="number" inputMode="decimal" step="any" min="0" value={f.share} onChange={(e) => setFuel(i, { share: e.target.value })} onFocus={at(1, "fuel")} aria-label={`${f.name} share in percent`} className={small} />
                    <input type="number" inputMode="decimal" step="any" min="0" value={f.cv} onChange={(e) => setFuel(i, { cv: e.target.value })} onFocus={at(1, "fuel")} aria-label={`${f.name} calorific value in kJ per kg`} className={small} />
                  </div>
                );
              })}
              <div className="mt-1 flex items-center justify-between border-t border-line pt-3 text-sm">
                <span className="text-mut">Total share</span>
                <span className={`font-mono tabular-nums ${Math.abs(total - 100) < 0.01 ? "text-ok" : "text-warm"}`}>{fmt(total, 1)} %</span>
              </div>
              {err.fuels && (
                <p role="alert" className="text-sm text-bad">
                  {err.fuels}
                </p>
              )}
            </div>
          </section>
          <Step n={2} title="Firing" note="How much fuel, and how well the boiler uses it" active={step === 2}>
            <QuantityField label="Fuel firing rate" quantity="flow" value={v.fuelRate} onChange={(x) => set("fuelRate", x)} onFocus={at(2, "furnace")} error={err.fuelRate} range={[0.3, 15]} />
            <PercentField label="Boiler efficiency" value={v.efficiency} onChange={(x) => set("efficiency", x)} onFocus={at(2, "furnace")} error={err.efficiency} hint="On gross calorific value" range={[50, 95]} />
          </Step>
          <Step n={3} title="Steam and feed water" note="At the boiler outlet and the economiser inlet" active={step === 3}>
            <QuantityField label="Boiler exit pressure" quantity="pressure" value={v.p} onChange={(x) => set("p", x)} onFocus={at(3, "steam")} error={err.p} range={[1, 12]} />
            <QuantityField label="Boiler exit temperature" quantity="temperature" value={v.T} onChange={(x) => set("T", x)} onFocus={at(3, "steam")} error={err.T} range={[473.15, 838.15]} />
            <QuantityField label="Feed water temperature" quantity="temperature" value={v.Tfw} onChange={(x) => set("Tfw", x)} onFocus={at(3, "feed")} error={err.Tfw} range={[303.15, 523.15]} />
          </Step>
        </>
      }
      diagram={
        <BoilerDiagram
          className="w-full"
          active={part}
          fire={Number.isFinite(fuelKg) ? Math.min(1, fuelKg / 10) : 0.4}
          steam={result.ok ? Math.min(1, result.steam / 30) : 0.3}
          labels={{
            fuel: `${v.fuelRate.v} ${v.fuelRate.u}`,
            feed: `${v.Tfw.v} ${v.Tfw.u}`,
            steam: result.ok ? `${fmt(tph, 1)} TPH` : undefined,
            furnace: result.ok ? `${fmt(result.heatInput / 1000, 1)} MW heat` : undefined,
          }}
        />
      }
      results={
        result.ok ? (
          <>
            <Headline label="Steam generation" value={fmt(tph, 2)} unit="TPH" sub={`${fmt(result.steam, 3)} kg/s  ·  ${fmt(result.steamToFuel, 2)} kg steam per kg fuel`} />
            <Figures
              items={[
                { label: "Heat input", value: `${fmt(result.heatInput / 1000, 2)} MW` },
                { label: "Heat to steam", value: `${fmt(result.heatToSteam / 1000, 2)} MW` },
                { label: "Blended CV", value: `${fmt(result.cv, 0)} kJ/kg` },
                { label: "Steam to fuel", value: `${fmt(result.steamToFuel, 2)} kg/kg` },
              ]}
            />
            <Warnings items={result.warnings} />
            <PropTable
              title="Steam and water properties"
              rows={[
                ["Steam enthalpy at boiler exit", `${fmt(result.hSteam, 1)} kJ/kg`],
                ["Feed water enthalpy", `${fmt(result.hFeed, 1)} kJ/kg`],
                ["Heat added per kg of steam", `${fmt(result.hSteam - result.hFeed, 1)} kJ/kg`],
                ["Blended CV", `${fmt(result.cv / 4.1868, 0)} kcal/kg`],
              ]}
            />
          </>
        ) : (
          <Blocked issues={result.issues} />
        )
      }
    />
  );
}
