"use client";

import { useMemo, useState } from "react";
import { Cutaway, type Part } from "@/components/turbine/Cutaway";
import { requiredFlow } from "@/lib/steam/turbine";
import { fromBase } from "@/lib/steam/units";
import { HsChart } from "./HsChart";
import { Blocked, Figures, Headline, PropTable, Warnings, fmt } from "./Results";
import { Workspace, type Saved } from "./Workspace";
import { PercentField, QuantityField, Step, base, errorsOf, pct, q, type Q } from "./fields";

type Inputs = { power: Q; p1: Q; t1: Q; p2: Q; type: "impulse" | "reaction" | "custom"; etaOverall: string };

const DEFAULTS: Inputs = { power: q(5000, "kW"), p1: q(66, "kg/cm²(a)"), t1: q(485, "°C"), p2: q(3.5, "kg/cm²(a)"), type: "impulse", etaOverall: "60" };
const TYPICAL = { impulse: "60", reaction: "70" } as const;

export function FlowCalc({ saved }: { saved: Saved }) {
  const [v, setV] = useState<Inputs>(() => ({ ...DEFAULTS, ...((saved?.inputs as Partial<Inputs>) ?? {}) }));
  const [part, setPart] = useState<Part | null>(null);
  const [step, setStep] = useState(0);
  const set = <K extends keyof Inputs>(k: K, value: Inputs[K]) => setV((p) => ({ ...p, [k]: value }));
  const at = (s: number, p: Part) => () => {
    setStep(s);
    setPart(p);
  };

  const result = useMemo(
    () => requiredFlow({ power: base("power", v.power), p1: base("pressure", v.p1), T1: base("temperature", v.t1), p2: base("pressure", v.p2), etaOverall: pct(v.etaOverall) }),
    [v],
  );
  const err = errorsOf(result);
  const kw = base("power", v.power);
  const T1 = base("temperature", v.t1);
  const wet = result.ok && result.expansion.ideal.phase === "wet";
  const tph = result.ok ? fromBase("flow", "TPH", result.flow) : 0;

  return (
    <Workspace
      kind="flow"
      title="Steam flow"
      lead="The steam you need at the stop valve to reach a power target."
      saved={saved}
      inputs={v}
      summary={result.ok ? `${fmt(tph, 2)} TPH for ${v.power.v} ${v.power.u}` : ""}
      canSave={result.ok}
      form={
        <>
          <Step n={1} title="Target" note="What the generator must deliver" active={step === 1}>
            <QuantityField label="Required output" quantity="power" value={v.power} onChange={(x) => set("power", x)} onFocus={at(1, "generator")} error={err.power} range={[500, 30000]} />
          </Step>
          <Step n={2} title="Steam conditions" note="Available at the inlet, and the back pressure" active={step === 2}>
            <QuantityField label="Inlet pressure" quantity="pressure" value={v.p1} onChange={(x) => set("p1", x)} onFocus={at(2, "inlet")} error={err.p1} range={[1, 12]} />
            <QuantityField label="Inlet temperature" quantity="temperature" value={v.t1} onChange={(x) => set("t1", x)} onFocus={at(2, "inlet")} error={err.t1} range={[473.15, 838.15]} />
            <QuantityField label="Back pressure" quantity="pressure" value={v.p2} onChange={(x) => set("p2", x)} onFocus={at(2, "exhaust")} error={err.p2} range={[0.005, 1.5]} />
          </Step>
          <Step n={3} title="Machine" note="Overall efficiency, steam to generator terminals" active={step === 3}>
            <div>
              <label htmlFor="flow-type" className="mb-1.5 block text-sm text-mut">
                Turbine type
              </label>
              <select
                id="flow-type"
                value={v.type}
                onFocus={at(3, "blades")}
                onChange={(e) => {
                  const t = e.target.value as Inputs["type"];
                  setV((p) => ({ ...p, type: t, etaOverall: t === "custom" ? p.etaOverall : TYPICAL[t] }));
                }}
                className="h-11 w-full rounded-xl border border-line bg-panel-2 px-3 text-[15px] outline-none focus:border-brand"
              >
                <option value="impulse">Impulse (typical 60 %)</option>
                <option value="reaction">Reaction (typical 70 %)</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <PercentField label="Overall efficiency" value={v.etaOverall} onChange={(x) => setV((p) => ({ ...p, etaOverall: x, type: "custom" }))} onFocus={at(3, "blades")} error={err.etaOverall} range={[30, 90]} />
          </Step>
        </>
      }
      diagram={
        <Cutaway
          className="w-full"
          active={part}
          flow={result.ok ? Math.min(1, result.flow / 35) : 0.3}
          heat={Number.isFinite(T1) ? Math.min(1, Math.max(0, (T1 - 523) / 300)) : 0.5}
          load={Number.isFinite(kw) ? Math.min(1, kw / 15000) : 0.3}
          wet={wet}
          labels={{
            inlet: result.ok ? `${fmt(tph, 1)} TPH needed` : `${v.p1.v} ${v.p1.u}`,
            exhaust: `${v.p2.v} ${v.p2.u}`,
            generator: `${v.power.v} ${v.power.u}`,
          }}
        />
      }
      results={
        result.ok ? (
          <>
            <Headline label="Steam flow needed" value={fmt(tph, 2)} unit="TPH" sub={`${fmt(result.flow, 3)} kg/s  ·  ${fmt(result.flow * 3600, 0)} kg/h`} />
            <Figures
              items={[
                { label: "Isentropic drop", value: `${fmt(result.expansion.dh, 1)} kJ/kg` },
                { label: "Steam rate", value: `${fmt(result.steamRate, 2)} kg/kWh` },
                { label: "Ideal steam power", value: `${fmt(result.idealPower, 0)} kW` },
                {
                  label: "Ideal exhaust",
                  value: wet ? `${fmt(result.expansion.ideal.x * 100, 1)} % dry` : `${fmt(result.expansion.ideal.T - 273.15, 1)} °C`,
                  tone: wet ? "cool" : undefined,
                },
              ]}
            />
            <Warnings items={result.warnings} />
            <div className="grid gap-6 lg:grid-cols-2">
              <PropTable
                title="Steam properties"
                rows={[
                  ["Inlet enthalpy h₁", `${fmt(result.expansion.h1, 1)} kJ/kg`],
                  ["Inlet entropy s₁", `${fmt(result.expansion.s1, 4)} kJ/(kg·K)`],
                  ["Ideal exhaust enthalpy h₂ₛ", `${fmt(result.expansion.ideal.h, 1)} kJ/kg`],
                  ["Boiling point at exhaust", `${fmt(result.expansion.tsat2 - 273.15, 1)} °C`],
                ]}
              />
              <div>
                <h3 className="mb-2 text-sm font-semibold">Expansion on the h-s chart</h3>
                <HsChart p1={base("pressure", v.p1)} p2={base("pressure", v.p2)} inlet={{ h: result.expansion.h1, s: result.expansion.s1 }} ideal={result.expansion.ideal} />
              </div>
            </div>
          </>
        ) : (
          <Blocked issues={result.issues} />
        )
      }
    />
  );
}
